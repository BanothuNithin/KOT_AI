export enum Unit {
  KG = 'kg',
  L = 'L',
  PCS = 'pcs',
  G = 'g',
  ML = 'ml'
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  totalStock: number;    // Physically available
  reservedStock: number; // Blocked by active KOTs
  expiryDate: string;    // YYYY-MM-DD
  lowStockThreshold: number; 
  costPerUnit: number;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  image: string;
  recipe: RecipeItem[];
}

export enum KOTStatus {
  ACTIVE = 'Active',
  PAID = 'Paid',
  DELETED = 'Deleted'
}

export interface KOTItem {
  dish: Dish;
  quantity: number;
}

export interface KOT {
  id: string;
  timestamp: number;
  items: KOTItem[];
  status: KOTStatus;
  totalAmount: number;
}

export enum AlertType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRY = 'EXPIRY',
  CRITICAL = 'CRITICAL'
}

export interface StockAlert {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: AlertType;
  message: string;
  timestamp: number;
}