
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export const BatchSchema = z.object({
  name: z.string().min(3, { message: 'Batch name must be at least 3 characters' }),
  vegetableType: z.string().min(2, { message: 'Vegetable type is required' }),
  purchaseDate: z.date({ required_error: 'Purchase date is required' }),
  quantityKg: z.coerce.number().positive({ message: 'Quantity must be positive' }),
  purchasePricePerKg: z.coerce.number().positive({ message: 'Purchase price must be positive' }),
  purchaseDiscountAmount: z.coerce.number().min(0, { message: 'Discount cannot be negative' }).optional().default(0),
  // transportCharges, laborCharges, otherBatchExpenses removed
  status: z.enum(['open', 'closed']).default('open'),
});

export const CustomerSchema = z.object({
  name: z.string().min(2, { message: 'Customer name must be at least 2 characters' }),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  address: z.string().optional(),
});

export const SaleSchema = z.object({
  batchId: z.string().min(1, { message: 'Batch is required' }),
  customerId: z.string().min(1, { message: 'Customer is required' }),
  saleDate: z.date({ required_error: 'Sale date is required' }),
  quantityKgSold: z.coerce.number().positive({ message: 'Quantity sold must be positive' }),
  pricePerKg: z.coerce.number().positive({ message: 'Price per kg must be positive' }),
  discountAmount: z.coerce.number().min(0, {message: "Discount cannot be negative"}).optional().default(0),
  paymentStatus: z.enum(['paid', 'unpaid']).default('unpaid'),
  notes: z.string().optional(),
});

export const ExpenseSchema = z.object({
  description: z.string().min(3, { message: 'Description must be at least 3 characters' }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive' }),
  expenseDate: z.date({ required_error: 'Expense date is required' }),
  category: z.string().optional(),
  batchId: z.string().optional(), // Added to link expense to a batch
});


// This type will be used by the form, totalAmount is calculated outside
export type SaleFormValues = z.infer<typeof SaleSchema>;
export type BatchFormValues = z.infer<typeof BatchSchema>;
export type ExpenseFormValues = z.infer<typeof ExpenseSchema>;

