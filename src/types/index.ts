
import type { User as FirebaseUser } from 'firebase/auth';

export interface Batch {
  id: string;
  name: string; // e.g., "Nashik Onions - Lot 1"
  vegetableType: string; // e.g., "Onion"
  purchaseDate: string; // ISO string or Timestamp
  quantityKg: number;
  purchasePricePerKg: number;
  totalPurchaseCost: number; // Gross cost: quantityKg * purchasePricePerKg
  purchaseDiscountAmount?: number; // Optional discount on the purchase
  // transportCharges, laborCharges, otherBatchExpenses removed
  status: 'open' | 'closed'; // Batch status
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface Customer {
  id: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface Sale {
  id: string;
  batchId: string;
  customerId: string;
  saleDate: string; // ISO string or Timestamp
  quantityKgSold: number;
  pricePerKg: number;
  discountAmount?: number; // Optional discount amount
  totalAmount: number; // Final amount after discount
  paymentStatus: 'paid' | 'unpaid';
  notes?: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string; // ISO string
  category?: string;
  batchId?: string; // Optional: to link expense to a specific batch
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

// For AuthContext
export interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signOutUser: () => Promise<void>;
}

// For Data Table
export interface DataTableColumn<T> {
  accessorKey: keyof T | string;
  header: string;
  cell?: (props: any) => JSX.Element;
}

// General Form Props
export interface BaseFormProps<T> {
  onSubmit: (data: T) => Promise<void>;
  initialData?: Partial<T>;
  onClose: () => void;
  isEditMode?: boolean;
}

