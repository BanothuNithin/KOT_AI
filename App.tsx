import React, { useState, useEffect, useRef } from "react";
import {
  Dish,
  Ingredient,
  KOT,
  KOTItem,
  KOTStatus,
  StockAlert,
  AlertType,
} from "./types";

import { INITIAL_INGREDIENTS, MENU } from "./constants";

import { InventoryTable } from "./components/InventoryTable";
import { MenuGrid } from "./components/MenuGrid";
import { KOTList } from "./components/KOTList";
import { AlertsPanel } from "./components/AlertsPanel";

import { generateInventoryInsight } from "./services/geminiServices";

import {
  ShoppingCart,
  ChefHat,
  LayoutGrid,
  Receipt,
  BarChart3,
  UtensilsCrossed,
} from "lucide-react";

const App: React.FC = () => {
  // ---------------- STATE ----------------
  const [inventory, setInventory] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [kots, setKots] = useState<KOT[]>([]);
  const [currentOrder, setCurrentOrder] = useState<KOTItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "kitchen" | "inventory">(
    "menu"
  );

  // Mutex to prevent duplicate KOT creation
  const placeOrderLock = useRef(false);

  // ============================================================
  // 🔥  ADD TO CART (Correct max-availability logic)
  // ============================================================
  const addToCart = (dish: Dish, qty: number) => {
    const maxPossible = dish.recipe.reduce((acc, recipeItem) => {
      const ing = inventory.find((i) => i.id === recipeItem.ingredientId);
      if (!ing) return 0;

      const available = ing.totalStock - ing.reservedStock;
      const dishMax = Math.floor(available / recipeItem.quantity);

      return Math.min(acc, dishMax);
    }, Infinity);

    const limit = maxPossible === Infinity ? 0 : maxPossible;

    setCurrentOrder((prev) => {
      const existing = prev.find((p) => p.dish.id === dish.id);
      const currentQty = existing ? existing.quantity : 0;

      const remaining = limit - currentQty;
      if (remaining <= 0) {
        alert(`Cannot add more ${dish.name}. Out of stock.`);
        return prev;
      }

      const qtyToAdd = Math.min(qty, remaining);

      if (existing) {
        return prev.map((p) =>
          p.dish.id === dish.id ? { ...p, quantity: p.quantity + qtyToAdd } : p
        );
      }

      return [...prev, { dish, quantity: qtyToAdd }];
    });
  };

  // ============================================================
  // 🔥 ATOMIC KOT CREATION + RACE CONDITION LOCK
  // ============================================================
  const handlePlaceOrder = () => {
    if (currentOrder.length === 0) return alert("Cart is empty");
    if (placeOrderLock.current) return alert("Processing...");

    placeOrderLock.current = true;

    // Build total required map
    const needed: Record<string, number> = {};
    currentOrder.forEach((item) => {
      item.dish.recipe.forEach((r) => {
        needed[r.ingredientId] =
          (needed[r.ingredientId] || 0) + r.quantity * item.quantity;
      });
    });

    let failed = false;

    // ATOMIC VALIDATION + UPDATE
    setInventory((prev) => {
      const updated = prev.map((i) => ({ ...i }));

      // Validate
      for (const [id, qty] of Object.entries(needed)) {
        const ing = updated.find((x) => x.id === id);
        if (!ing || ing.totalStock - ing.reservedStock < qty) {
          failed = true;
          return prev;
        }
      }

      // Apply reservation
      for (const [id, qty] of Object.entries(needed)) {
        const ing = updated.find((x) => x.id === id);
        ing.reservedStock += qty;
      }

      return updated;
    });

    if (failed) {
      placeOrderLock.current = false;
      return alert("Insufficient stock for this order.");
    }

    // Create KOT
    const newKot: KOT = {
      id: `kot-${Date.now()}`,
      timestamp: Date.now(),
      items: [...currentOrder],
      status: KOTStatus.ACTIVE,
      totalAmount: currentOrder.reduce(
        (sum, item) => sum + item.dish.price * item.quantity,
        0
      ),
    };

    setKots((prev) => [newKot, ...prev]);
    setCurrentOrder([]);

    if (window.innerWidth < 1024) setActiveTab("kitchen");
    placeOrderLock.current = false;
  };

  // ============================================================
  // 🔥 PAY KOT (with clamping)
  // ============================================================
  const handlePayKOT = (kotId: string) => {
    const kot = kots.find((k) => k.id === kotId);
    if (!kot || kot.status !== KOTStatus.ACTIVE) return;

    const usage: Record<string, number> = {};
    kot.items.forEach((item) => {
      item.dish.recipe.forEach((r) => {
        usage[r.ingredientId] =
          (usage[r.ingredientId] || 0) + r.quantity * item.quantity;
      });
    });

    setInventory((prev) =>
      prev.map((ing) => {
        const used = usage[ing.id];
        if (!used) return ing;

        return {
          ...ing,
          totalStock: Math.max(0, ing.totalStock - used),
          reservedStock: Math.max(0, ing.reservedStock - used),
        };
      })
    );

    setKots((prev) =>
      prev.map((k) => (k.id === kotId ? { ...k, status: KOTStatus.PAID } : k))
    );
  };

  // ============================================================
  // 🔥 DELETE KOT (revert reserved stock)
  // ============================================================
  const handleDeleteKOT = (kotId: string) => {
    const kot = kots.find((k) => k.id === kotId);
    if (!kot || kot.status !== KOTStatus.ACTIVE) return;

    const usage: Record<string, number> = {};
    kot.items.forEach((item) => {
      item.dish.recipe.forEach((r) => {
        usage[r.ingredientId] =
          (usage[r.ingredientId] || 0) + r.quantity * item.quantity;
      });
    });

    setInventory((prev) =>
      prev.map((ing) => {
        const revert = usage[ing.id];
        if (!revert) return ing;

        return {
          ...ing,
          reservedStock: Math.max(0, ing.reservedStock - revert),
        };
      })
    );

    setKots((prev) =>
      prev.map((k) =>
        k.id === kotId ? { ...k, status: KOTStatus.DELETED } : k
      )
    );
  };

  // ============================================================
  // 🔥  AI AGENT: dedupe + expiry classification
  // ============================================================
  useEffect(() => {
    const runAgent = () => {
      const now = Date.now();
      const newAlerts: StockAlert[] = [];

      inventory.forEach((item) => {
        const available = item.totalStock - item.reservedStock;
        const lowStock = available <= item.lowStockThreshold;

        // --- Low stock alerts ---
        if (lowStock) {
          newAlerts.push({
            id: `low-${item.id}`,
            ingredientId: item.id,
            ingredientName: item.name,
            type: available <= 0 ? AlertType.CRITICAL : AlertType.LOW_STOCK,
            message:
              available <= 0
                ? `${item.name} is OUT OF STOCK!`
                : `${item.name} is low (${available} ${item.unit} left).`,
            timestamp: now,
          });
        }

        // --- Expiry ---
        const expDays =
          (new Date(item.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);

        if (expDays <= 0) {
          newAlerts.push({
            id: `expired-${item.id}`,
            ingredientId: item.id,
            ingredientName: item.name,
            type: AlertType.EXPIRY,
            message: `${item.name} has EXPIRED!`,
            timestamp: now,
          });
        } else if (expDays <= 3) {
          newAlerts.push({
            id: `exp-${item.id}`,
            ingredientId: item.id,
            ingredientName: item.name,
            type: AlertType.EXPIRY,
            message: `${item.name} expires in ${Math.ceil(expDays)} days.`,
            timestamp: now,
          });
        }
      });

      // Deduplicate alerts
      setAlerts((prev) => {
        const map = new Map(prev.map((a) => [a.id, a]));
        newAlerts.forEach((a) => map.set(a.id, a));
        return Array.from(map.values());
      });
    };

    runAgent();
    const t = setInterval(runAgent, 5000);

    return () => clearInterval(t);
  }, [inventory]);

  // ============================================================
  // AI Insight Fetch
  // ============================================================
  const handleAiInsight = async () => {
    setIsGeneratingInsight(true);
    const text = await generateInventoryInsight(inventory, kots);
    setAiInsight(text);
    setIsGeneratingInsight(false);
  };

  // ============================================================
  // RENDER UI  (UNCHANGED)
  // ============================================================

  const cartTotal = currentOrder.reduce(
    (sum, item) => sum + item.dish.price * item.quantity,
    0
  );

  const activeKotsCount = kots.filter(
    (k) => k.status === KOTStatus.ACTIVE
  ).length;

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="w-full px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
              <ChefHat className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold">SmartKOT</h1>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Online
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-16 lg:pb-0">
        {/* MENU COLUMN */}
        <section
          className={`
          flex-col border-r border-slate-200 bg-white 
          lg:flex-[3] lg:flex
          ${activeTab === "menu" ? "flex" : "hidden"}
        `}
        >
          <div className="p-4 border-b bg-white sticky top-0">
            <h2 className="font-bold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Menu
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <MenuGrid
              menu={MENU}
              ingredients={inventory}
              onAddToOrder={addToCart}
            />
          </div>

          {/* CART FOOTER */}
          <div className="p-4 border-t bg-slate-50">
            {currentOrder.length > 0 ? (
              <div>
                <div className="flex justify-between mb-2 font-bold">
                  <span>Current Order</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <ul className="max-h-24 overflow-y-auto text-sm mb-2">
                  {currentOrder.map((item, idx) => (
                    <li className="flex justify-between" key={idx}>
                      <span>
                        {item.quantity}x {item.dish.name}
                      </span>
                      <span>
                        ${(item.dish.price * item.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentOrder([])}
                    className="text-slate-500"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handlePlaceOrder}
                    className="flex-1 bg-indigo-600 text-white rounded py-2"
                  >
                    <ShoppingCart className="w-4 h-4 inline-block mr-1" />
                    Place Order
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400">Cart is empty</p>
            )}
          </div>
        </section>

        {/* KITCHEN COLUMN */}
        <section
          className={`
          flex-col border-r bg-slate-50
          lg:flex-[4] lg:flex
          ${activeTab === "kitchen" ? "flex" : "hidden"}
        `}
        >
          <div className="p-4 border-b bg-white sticky top-0 flex justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Kitchen
            </h2>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">
              {activeKotsCount} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <KOTList
              kots={kots}
              onPayKOT={handlePayKOT}
              onDeleteKOT={handleDeleteKOT}
            />
          </div>
        </section>

        {/* INVENTORY COLUMN */}
        <section
          className={`
          flex-col bg-white 
          lg:flex-[3] lg:flex
          ${activeTab === "inventory" ? "flex" : "hidden"}
        `}
        >
          <div className="border-b">
            <AlertsPanel
              alerts={alerts}
              aiInsight={aiInsight}
              onGenerateInsight={handleAiInsight}
              isGenerating={isGeneratingInsight}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-3 bg-slate-50 border-b flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <h2 className="font-bold text-sm">Live Inventory</h2>
            </div>

            <div className="flex-1 overflow-auto">
              <InventoryTable ingredients={inventory} />
            </div>
          </div>
        </section>
      </main>

      {/* MOBILE NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex">
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex-1 flex flex-col items-center justify-center ${
            activeTab === "menu" ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Menu</span>
        </button>

        <button
          onClick={() => setActiveTab("kitchen")}
          className={`flex-1 flex flex-col items-center justify-center ${
            activeTab === "kitchen" ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          <ChefHat className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Kitchen</span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex-1 flex flex-col items-center justify-center ${
            activeTab === "inventory" ? "text-indigo-600" : "text-slate-400"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase">Stock</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
