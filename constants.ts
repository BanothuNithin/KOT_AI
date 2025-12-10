import { Dish, Ingredient, Unit } from "./types";

export const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: "ing-1",
    name: "Burger Bun",
    unit: Unit.PCS,
    totalStock: 50,
    reservedStock: 0,
    expiryDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], // 2 days from now
    lowStockThreshold: 10,
    costPerUnit: 0.5,
  },
  {
    id: "ing-2",
    name: "Beef Patty",
    unit: Unit.PCS,
    totalStock: 20,
    reservedStock: 0,
    expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], // 5 days
    lowStockThreshold: 5,
    costPerUnit: 2.0,
  },
  {
    id: "ing-3",
    name: "Cheddar Cheese",
    unit: Unit.PCS,
    totalStock: 100,
    reservedStock: 0,
    expiryDate: new Date(Date.now() + 86400000 * 14)
      .toISOString()
      .split("T")[0],
    lowStockThreshold: 10,
    costPerUnit: 0.3,
  },
  {
    id: "ing-4",
    name: "Lettuce",
    unit: Unit.PCS,
    totalStock: 15,
    reservedStock: 0,
    expiryDate: new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0], // 1 day (Risk)
    lowStockThreshold: 5,
    costPerUnit: 0.2,
  },
  {
    id: "ing-5",
    name: "Tomato Sauce",
    unit: Unit.ML,
    totalStock: 2000,
    reservedStock: 0,
    expiryDate: new Date(Date.now() + 86400000 * 30)
      .toISOString()
      .split("T")[0],
    lowStockThreshold: 200,
    costPerUnit: 0.01,
  },
  {
    id: "ing-6",
    name: "Pizza Dough",
    unit: Unit.PCS,
    totalStock: 12,
    reservedStock: 0,
    expiryDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    lowStockThreshold: 5,
    costPerUnit: 1.5,
  },
];

export const MENU: Dish[] = [
  {
    id: "dish-1",
    name: "Classic Cheeseburger",
    price: 12.99,
    image:
      "https://img.freepik.com/premium-photo/classic-cheeseburger_1112544-268.jpg",
    recipe: [
      { ingredientId: "ing-1", quantity: 1 }, // 1 Bun
      { ingredientId: "ing-2", quantity: 1 }, // 1 Patty
      { ingredientId: "ing-3", quantity: 1 }, // 1 Cheese
      { ingredientId: "ing-4", quantity: 1 }, // 1 Lettuce
      { ingredientId: "ing-5", quantity: 20 }, // 20ml Sauce
    ],
  },
  {
    id: "dish-2",
    name: "Double Trouble Burger",
    price: 16.99,
    image:
      "https://tse1.mm.bing.net/th/id/OIP.gw9sPjUM5AKcho3mefL77wHaFb?pid=Api&P=0&h=180",
    recipe: [
      { ingredientId: "ing-1", quantity: 1 },
      { ingredientId: "ing-2", quantity: 2 }, // 2 Patties
      { ingredientId: "ing-3", quantity: 2 },
      { ingredientId: "ing-5", quantity: 30 },
    ],
  },
  {
    id: "dish-3",
    name: "Margherita Pizza",
    price: 14.5,
    image:
      "https://d2lswn7b0fl4u2.cloudfront.net/photos/pg-margherita-pizza-1611491820.jpg",
    recipe: [
      { ingredientId: "ing-6", quantity: 1 }, // 1 Dough
      { ingredientId: "ing-5", quantity: 100 }, // 100ml Sauce
      { ingredientId: "ing-3", quantity: 2 }, // 2 Cheese units
    ],
  },
];
