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
  customerId?: string; // Add customer reference
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

// Invoice System Types
export interface Customer {
  id?: string; // UUID
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'CHEF' | 'ASSEMBLER';
}

export interface InvoiceItem {
  id?: string; // UUID
  invoiceId?: string;
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id?: string; // UUID
  invoiceNumber: string;
  customerId: string;
  kotId: string;
  subtotal: number;
  tax: number; // e.g., 18% GST
  total: number;
  status: 'generated' | 'paid' | 'cancelled';
  createdAt?: string;
  items: InvoiceItem[];
}

