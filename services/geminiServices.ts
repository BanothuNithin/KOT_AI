import { Ingredient, KOT } from "../types";

export const generateInventoryInsight = async (
  inventory: Ingredient[],
  kots: KOT[],
  token: string | null
): Promise<string> => {
  try {
    // Prepare the prompt
    const inventorySummary = inventory.map((i) => ({
      name: i.name,
      available: i.totalStock - i.reservedStock,
      expiry: i.expiryDate,
      unit: i.unit,
    }));

    const activeOrders = kots.filter((k) => k.status === "Active").length;

    const prompt = `
You are an expert Restaurant Inventory AI.

Analyze:

Active Orders: ${activeOrders}
Inventory Summary: ${JSON.stringify(inventorySummary)}

Provide:
1. Most critical low-stock or upcoming expiry issue.
2. One dish recommendation based on abundant ingredients.
3. Keep response in 2–3 short sentences.
    `;

    // Call backend API
    const res = await fetch("http://localhost:3001/ai/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      return "AI Service unavailable.";
    }

    const data = await res.json();
    return data.text || "No insights generated.";
  } catch (error) {
    console.error("Frontend AI Error:", error);
    return "AI Service unavailable.";
  }
};


