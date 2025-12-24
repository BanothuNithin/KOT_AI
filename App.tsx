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
import Login from "./components/Login";
import Register from "./components/Register";
import DeliveryStats from "./components/DeliveryStats";
import InventoryModal from "./components/InventoryModal";
import ActiveOrdersDashboard from "./components/ActiveOrdersDashboard";

import { generateInventoryInsight } from "./services/geminiServices";

import {
  ShoppingCart,
  ChefHat,
  LayoutGrid,
  Receipt,
  BarChart3,
  UtensilsCrossed,
  LogOut,
  User,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN' | 'CHEF' | 'ASSEMBLER';
}

const App: React.FC = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState<string | null>(null);

  // ---------------- STATE ----------------
  const [inventory, setInventory] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [kots, setKots] = useState<KOT[]>([]);
  const [currentOrder, setCurrentOrder] = useState<KOTItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "kitchen" | "inventory">("menu");

  // Inventory modal state
  const [inventoryModalDish, setInventoryModalDish] = useState<Dish | null>(null);

  // Mutex to prevent duplicate KOT creation
  const placeOrderLock = useRef(false);

  // Check for existing authentication on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setToken(storedToken);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Handle login/register/logout
  const handleLogin = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
  };
  const handleRegister = handleLogin;
  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentOrder([]);
    setDeliveryAddress('');
    setActiveTab('menu');
  };

  // Computed values
  const cartTotal = currentOrder.reduce(
    (sum, item) => sum + item.dish.price * item.quantity,
    0
  );
  const activeKotsCount = kots.filter(kot => kot.status === KOTStatus.ACTIVE).length;

  // ---------------- ADD TO CART ----------------
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

  // ---------------- UPDATE INVENTORY (Chef Only) ----------------
  const handleUpdateInventory = (dish: Dish) => {
    if (currentUser?.role !== 'CHEF') return;
    setInventoryModalDish(dish);
  };

  const handleUpdateStock = (ingredientId: string, newStock: number) => {
    setInventory(prev => prev.map(ing =>
      ing.id === ingredientId
        ? { ...ing, totalStock: newStock }
        : ing
    ));
  };

  const closeInventoryModal = () => {
    setInventoryModalDish(null);
  };

  // ---------------- PLACE ORDER ----------------
  const handlePlaceOrder = () => {
    if (!currentUser) return alert("Please login first");
    if (currentOrder.length === 0) return alert("Cart is empty");
    if (placeOrderLock.current) return alert("Processing...");

    placeOrderLock.current = true;

    const needed: Record<string, number> = {};
    currentOrder.forEach((item) => {
      item.dish.recipe.forEach((r) => {
        needed[r.ingredientId] = (needed[r.ingredientId] || 0) + r.quantity * item.quantity;
      });
    });

    let failed = false;

    setInventory((prev) => {
      const updated = prev.map((i) => ({ ...i }));
      for (const [id, qty] of Object.entries(needed)) {
        const ing = updated.find((x) => x.id === id);
        if (!ing || ing.totalStock - ing.reservedStock < qty) {
          failed = true;
          return prev;
        }
      }
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

    const newKot: KOT = {
      id: `kot-${Date.now()}`,
      timestamp: Date.now(),
      items: [...currentOrder],
      status: KOTStatus.ACTIVE,
      totalAmount: currentOrder.reduce((sum, item) => sum + item.dish.price * item.quantity, 0),
      customerId: currentUser.id,
    };

    setKots((prev) => [newKot, ...prev]);
    setCurrentOrder([]);
    if (window.innerWidth < 1024) setActiveTab("kitchen");
    placeOrderLock.current = false;
  };

  // ---------------- PAY KOT ----------------
  const handlePayKOT = async (kotId: string, address: string) => {
    const kot = kots.find((k) => k.id === kotId);
    if (!kot || kot.status !== KOTStatus.ACTIVE) return;
    if (!address.trim()) return alert('Delivery address is required');

    setDeliveryAddress(address);

    const usage: Record<string, number> = {};
    kot.items.forEach((item) => {
      item.dish.recipe.forEach((r) => {
        usage[r.ingredientId] = (usage[r.ingredientId] || 0) + r.quantity * item.quantity;
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

    try {
      const response = await fetch('http://localhost:3001/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kotId: kot.id,
          items: kot.items,
          deliveryAddress: address.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Payment successful! Invoice downloaded.');
    } catch (error) {
      console.error(error);
      alert('Payment successful, but invoice download failed.');
    }
  };

  // ---------------- DELETE KOT ----------------
  const handleDeleteKOT = (kotId: string) => {
    const kot = kots.find((k) => k.id === kotId);
    if (!kot || kot.status !== KOTStatus.ACTIVE) return;

    const usage: Record<string, number> = {};
    kot.items.forEach((item) => {
      item.dish.recipe.forEach((r) => {
        usage[r.ingredientId] = (usage[r.ingredientId] || 0) + r.quantity * item.quantity;
      });
    });

    setInventory((prev) =>
      prev.map((ing) => {
        const revert = usage[ing.id];
        if (!revert) return ing;
        return { ...ing, reservedStock: Math.max(0, ing.reservedStock - revert) };
      })
    );

    setKots((prev) =>
      prev.map((k) => (k.id === kotId ? { ...k, status: KOTStatus.DELETED } : k))
    );
  };

  // ---------------- AI Agent & Alerts ----------------
  useEffect(() => {
    const runAgent = () => {
      const now = Date.now();
      const newAlerts: StockAlert[] = [];

      inventory.forEach((item) => {
        const available = item.totalStock - item.reservedStock;
        if (available <= item.lowStockThreshold) {
          newAlerts.push({
            id: `low-${item.id}`,
            ingredientId: item.id,
            ingredientName: item.name,
            type: available <= 0 ? AlertType.CRITICAL : AlertType.LOW_STOCK,
            message: available <= 0
              ? `${item.name} is OUT OF STOCK!`
              : `${item.name} is low (${available} ${item.unit} left).`,
            timestamp: now,
          });
        }

        const expDays = (new Date(item.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
        if (expDays <= 0) {
          newAlerts.push({ id: `expired-${item.id}`, ingredientId: item.id, ingredientName: item.name, type: AlertType.EXPIRY, message: `${item.name} has EXPIRED!`, timestamp: now });
        } else if (expDays <= 3) {
          newAlerts.push({ id: `exp-${item.id}`, ingredientId: item.id, ingredientName: item.name, type: AlertType.EXPIRY, message: `${item.name} expires in ${Math.ceil(expDays)} days.`, timestamp: now });
        }
      });

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

  const handleAiInsight = async () => {
    setIsGeneratingInsight(true);
    const text = await generateInventoryInsight(inventory, kots, token);
    setAiInsight(text);
    setIsGeneratingInsight(false);
  };

  const hasStaffPrivileges = currentUser?.role === 'ADMIN' || currentUser?.role === 'CHEF' || currentUser?.role === 'ASSEMBLER';

  useEffect(() => {
    if (!hasStaffPrivileges && activeTab === 'inventory') {
      setActiveTab('menu');
    }
  }, [hasStaffPrivileges, activeTab]);

  // ---------------- RENDER ----------------
  if (!isAuthenticated) {
    return (
      <div className="App">
        {authMode === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 overflow-hidden">
      {/* Enhanced Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex-shrink-0 shadow-sm">
        <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg">
              <ChefHat className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                SmartKOT
              </h1>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Inventory Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-slate-100 px-3 py-1.5 rounded-full">
              <User className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline text-slate-700 font-medium">{currentUser?.name}</span>
              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full">{currentUser?.role}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></span>
              <span className="text-xs text-slate-600 font-medium hidden sm:inline">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - Responsive Design */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Layout - All Sections Visible */}
        <div className="hidden lg:flex flex-1 overflow-hidden gap-4 p-4">
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                Menu
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <MenuGrid
                  menu={MENU}
                  ingredients={inventory}
                  onAddToOrder={addToCart}
                  onUpdateInventory={handleUpdateInventory}
                  currentUser={currentUser}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200/60 bg-slate-50/80 backdrop-blur-sm">
              {currentOrder.length > 0 ? (
                <div className="card">
                  <div className="flex justify-between mb-3 font-bold text-lg">
                    <span>Current Order</span>
                    <span className="text-indigo-600">₹{cartTotal.toFixed(2)}</span>
                  </div>

                  <ul className="max-h-32 overflow-y-auto text-sm mb-4 space-y-1">
                    {currentOrder.map((item, idx) => (
                      <li className="flex justify-between py-1 px-2 bg-slate-50 rounded" key={idx}>
                        <span>{item.quantity}x {item.dish.name}</span>
                        <span className="font-medium">₹{(item.dish.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentOrder([])}
                      className="btn-secondary flex-1"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Place Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Your cart is empty</p>
                  <p className="text-sm text-slate-400">Add some delicious items!</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                {currentUser?.role === 'ADMIN' ? (
                  <>
                    <BarChart3 className="w-5 h-5 text-indigo-600" /> Delivery Dashboard
                  </>
                ) : currentUser?.role === 'CHEF' ? (
                  <>
                    <ChefHat className="w-5 h-5 text-orange-600" /> Active Orders Dashboard
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5 text-indigo-600" /> Your Order is here..😀
                  </>
                )}
              </h2>
              {currentUser?.role !== 'ADMIN' && currentUser?.role !== 'CHEF' && (
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                  {activeKotsCount} Active Orders
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {currentUser?.role === 'ADMIN' ? (
                <DeliveryStats token={token} />
              ) : currentUser?.role === 'CHEF' ? (
                <ActiveOrdersDashboard
                  kots={kots}
                  onPayKOT={handlePayKOT}
                  onDeleteKOT={handleDeleteKOT}
                  currentUser={currentUser}
                />
              ) : (
                <div className="p-4">
                  <KOTList
                    kots={kots}
                    currentUser={currentUser}
                    deliveryAddress={deliveryAddress}
                    setDeliveryAddress={setDeliveryAddress}
                    onPayKOT={handlePayKOT}
                    onDeleteKOT={handleDeleteKOT}
                  />
                </div>
              )}
            </div>
          </div>

          {hasStaffPrivileges && (
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="border-b border-slate-200/60">
                <AlertsPanel alerts={alerts} aiInsight={aiInsight} onGenerateInsight={handleAiInsight} isLoading={isGeneratingInsight} />
              </div>
              <div className="flex-1 overflow-y-auto">
                <InventoryTable ingredients={inventory} />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Layout - Single Section with Navigation */}
        <div className="flex-1 overflow-hidden lg:hidden">
          {/* Menu Section */}
          <section className={`h-full flex flex-col transition-all duration-300 ${
            activeTab === "menu" ? "block" : "hidden"
          }`}>
            <div className="p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 shadow-sm">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                Menu
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MenuGrid
                menu={MENU}
                ingredients={inventory}
                onAddToOrder={addToCart}
                onUpdateInventory={handleUpdateInventory}
                currentUser={currentUser}
              />
            </div>
            <div className="p-4 border-t border-slate-200/60 bg-slate-50/80 backdrop-blur-sm">
              {currentOrder.length > 0 ? (
                <div className="card">
                  <div className="flex justify-between mb-3 font-bold text-lg">
                    <span>Current Order</span>
                    <span className="text-indigo-600">₹{cartTotal.toFixed(2)}</span>
                  </div>

                  <ul className="max-h-32 overflow-y-auto text-sm mb-4 space-y-1">
                    {currentOrder.map((item, idx) => (
                      <li className="flex justify-between py-1 px-2 bg-slate-50 rounded" key={idx}>
                        <span>{item.quantity}x {item.dish.name}</span>
                        <span className="font-medium">₹{(item.dish.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentOrder([])}
                      className="btn-secondary flex-1"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Place Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Your cart is empty</p>
                  <p className="text-sm text-slate-400">Add some delicious items!</p>
                </div>
              )}
            </div>
          </section>

          {/* Dashboard/Kitchen Section */}
          <section className={`h-full flex flex-col transition-all duration-300 ${
            activeTab === "kitchen" ? "block" : "hidden"
          }`}>
            <div className="p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 shadow-sm flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                {currentUser?.role === 'ADMIN' ? (
                  <>
                    <BarChart3 className="w-5 h-5 text-indigo-600" /> Delivery Dashboard
                  </>
                ) : currentUser?.role === 'CHEF' ? (
                  <>
                    <ChefHat className="w-5 h-5 text-orange-600" /> Active Orders Dashboard
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5 text-indigo-600" /> Your Order is here..😀
                  </>
                )}
              </h2>
              {currentUser?.role !== 'ADMIN' && currentUser?.role !== 'CHEF' && (
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                  {activeKotsCount} Active Orders
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {currentUser?.role === 'ADMIN' ? (
                <DeliveryStats token={token} />
              ) : currentUser?.role === 'CHEF' ? (
                <ActiveOrdersDashboard
                  kots={kots}
                  onPayKOT={handlePayKOT}
                  onDeleteKOT={handleDeleteKOT}
                  currentUser={currentUser}
                />
              ) : (
                <div className="p-4">
                  <KOTList
                    kots={kots}
                    currentUser={currentUser}
                    deliveryAddress={deliveryAddress}
                    setDeliveryAddress={setDeliveryAddress}
                    onPayKOT={handlePayKOT}
                    onDeleteKOT={handleDeleteKOT}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Inventory Section */}
          {hasStaffPrivileges && (
            <section className={`h-full flex flex-col transition-all duration-300 ${
              activeTab === "inventory" ? "block" : "hidden"
            }`}>
              <div className="border-b border-slate-200/60">
                <AlertsPanel alerts={alerts} aiInsight={aiInsight} onGenerateInsight={handleAiInsight} isLoading={isGeneratingInsight} />
              </div>
              <div className="flex-1 overflow-y-auto">
                <InventoryTable ingredients={inventory} />
              </div>
            </section>
          )}
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="bg-white border-t border-slate-200 shadow-lg lg:hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab("menu")}
              className={`flex-1 py-3 px-2 flex flex-col items-center justify-center transition-all duration-200 ${
                activeTab === "menu"
                  ? "bg-indigo-50 text-indigo-700 border-t-2 border-indigo-500"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className={`w-5 h-5 mb-1 ${
                activeTab === "menu" ? "text-indigo-600" : "text-slate-400"
              }`} />
              <span className={`text-xs font-medium ${
                activeTab === "menu" ? "text-indigo-700" : "text-slate-500"
              }`}>
                Menu
              </span>
            </button>

            <button
              onClick={() => setActiveTab("kitchen")}
              className={`flex-1 py-3 px-2 flex flex-col items-center justify-center transition-all duration-200 ${
                activeTab === "kitchen"
                  ? "bg-indigo-50 text-indigo-700 border-t-2 border-indigo-500"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {currentUser?.role === 'ADMIN' ? (
                <BarChart3 className={`w-5 h-5 mb-1 ${
                  activeTab === "kitchen" ? "text-indigo-600" : "text-slate-400"
                }`} />
              ) : currentUser?.role === 'CHEF' ? (
                <ChefHat className={`w-5 h-5 mb-1 ${
                  activeTab === "kitchen" ? "text-orange-600" : "text-slate-400"
                }`} />
              ) : (
                <Receipt className={`w-5 h-5 mb-1 ${
                  activeTab === "kitchen" ? "text-indigo-600" : "text-slate-400"
                }`} />
              )}
              <span className={`text-xs font-medium ${
                activeTab === "kitchen" ? "text-indigo-700" : "text-slate-500"
              }`}>
                {currentUser?.role === 'ADMIN' ? 'Dashboard' :
                 currentUser?.role === 'CHEF' ? 'Orders' : 'Kitchen'}
              </span>
            </button>

            {hasStaffPrivileges && (
              <button
                onClick={() => setActiveTab("inventory")}
                className={`flex-1 py-3 px-2 flex flex-col items-center justify-center transition-all duration-200 ${
                  activeTab === "inventory"
                    ? "bg-indigo-50 text-indigo-700 border-t-2 border-indigo-500"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <UtensilsCrossed className={`w-5 h-5 mb-1 ${
                  activeTab === "inventory" ? "text-indigo-600" : "text-slate-400"
                }`} />
                <span className={`text-xs font-medium ${
                  activeTab === "inventory" ? "text-indigo-700" : "text-slate-500"
                }`}>
                  Inventory
                </span>
              </button>
            )}
          </div>
        </nav>
      </main>
      {inventoryModalDish && (
        <InventoryModal
          dish={inventoryModalDish}
          ingredients={inventory}
          onClose={closeInventoryModal}
          onUpdateStock={handleUpdateStock}
        />
      )}
    </div>
  );
};

export default App;


