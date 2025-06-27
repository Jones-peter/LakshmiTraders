
import { db } from './config';
import type { Batch, Customer, Sale, Expense } from '@/types';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  Timestamp,
  orderBy, // Keep for single field ordering where allowed
  writeBatch as firestoreWriteBatch // For batch delete
} from "firebase/firestore";
import { parseISO, compareDesc } from 'date-fns';
import type { SaleFormValues, BatchFormValues, ExpenseFormValues } from '@/lib/schemas';


// Helper to transform Firestore Timestamps
function transformDocument<T extends { createdAt?: any, updatedAt?: any, purchaseDate?: any, saleDate?: any, expenseDate?: any }>(docSnap: any): T {
  const data = docSnap.data();
  const transformedData: any = { id: docSnap.id };

  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      if (key === 'purchaseDate' || key === 'saleDate' || key === 'expenseDate') {
        transformedData[key] = data[key].toDate().toISOString();
      } else if (key === 'createdAt' || key === 'updatedAt') {
        transformedData[key] = data[key].toMillis();
      } else {
        transformedData[key] = data[key].toDate(); // Default to Date object if not specified
      }
    } else {
      transformedData[key] = data[key];
    }
  }
  return transformedData as T;
}


// --- Batch Functions ---
export async function addBatch(batchData: BatchFormValues): Promise<Batch> {
  const totalPurchaseCost = batchData.quantityKg * batchData.purchasePricePerKg; // Gross cost
  const docRef = await addDoc(collection(db, "batches"), {
    ...batchData,
    totalPurchaseCost, // Store gross cost
    purchaseDiscountAmount: batchData.purchaseDiscountAmount || 0,
    purchaseDate: Timestamp.fromDate(new Date(batchData.purchaseDate)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const newDocSnap = await getDoc(docRef);
  return transformDocument<Batch>(newDocSnap);
}

export async function getBatches(): Promise<Batch[]> {
  const q = query(collection(db, "batches"), orderBy("purchaseDate", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => transformDocument<Batch>(docSnap));
}

export async function getOpenBatches(): Promise<Batch[]> {
  const batchesRef = collection(db, "batches");
  const q = query(batchesRef, where("status", "==", "open"));
  const querySnapshot = await getDocs(q);
  const openBatches = querySnapshot.docs.map(docSnap => transformDocument<Batch>(docSnap));
  // Client-side sort if orderBy on a different field than where ("status") is not allowed or too complex.
  return openBatches.sort((a, b) => compareDesc(parseISO(a.purchaseDate), parseISO(b.purchaseDate)));
}


export async function getBatchById(id: string): Promise<Batch | null> {
  const docRef = doc(db, "batches", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? transformDocument<Batch>(docSnap) : null;
}

export async function updateBatch(id: string, updates: Partial<BatchFormValues>): Promise<void> {
  const batchRef = doc(db, "batches", id);
  const updateData: any = { ...updates, updatedAt: serverTimestamp() };

  if (updates.purchaseDate && typeof updates.purchaseDate === 'string') {
    updateData.purchaseDate = Timestamp.fromDate(new Date(updates.purchaseDate));
  } else if (updates.purchaseDate instanceof Date) {
     updateData.purchaseDate = Timestamp.fromDate(updates.purchaseDate);
  }
  
  if (updates.quantityKg !== undefined || updates.purchasePricePerKg !== undefined) {
    const batchDocSnap = await getDoc(batchRef);
    if (batchDocSnap.exists()) {
      const currentBatchData = batchDocSnap.data() as Partial<Batch>; 
      const newQuantity = updates.quantityKg !== undefined ? updates.quantityKg : (currentBatchData.quantityKg || 0);
      const newPrice = updates.purchasePricePerKg !== undefined ? updates.purchasePricePerKg : (currentBatchData.purchasePricePerKg || 0);
      updateData.totalPurchaseCost = newQuantity * newPrice;
    }
  }

  if (updates.hasOwnProperty('purchaseDiscountAmount')) {
    updateData.purchaseDiscountAmount = updates.purchaseDiscountAmount || 0;
  }

  await updateDoc(batchRef, updateData);
}

export async function deleteBatch(id: string): Promise<void> {
  const batchRef = doc(db, "batches", id);
  await deleteDoc(batchRef);
}


// --- Customer Functions ---
export async function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const docRef = await addDoc(collection(db, "customers"), {
    ...customerData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const newDocSnap = await getDoc(docRef);
  return transformDocument<Customer>(newDocSnap);
}

export async function getCustomers(): Promise<Customer[]> {
  const q = query(collection(db, "customers"), orderBy("name", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => transformDocument<Customer>(docSnap));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const docRef = doc(db, "customers", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? transformDocument<Customer>(docSnap) : null;
}

export async function updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
  const customerRef = doc(db, "customers", id);
  await updateDoc(customerRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteCustomer(id: string): Promise<void> {
  const customerRef = doc(db, "customers", id);
  await deleteDoc(customerRef);
}


// --- Sale Functions ---
export async function addSale(saleData: SaleFormValues): Promise<Sale> {
  const subTotal = saleData.quantityKgSold * saleData.pricePerKg;
  const totalAmount = subTotal - (saleData.discountAmount || 0);
  
  const docRef = await addDoc(collection(db, "sales"), {
    ...saleData, 
    saleDate: Timestamp.fromDate(new Date(saleData.saleDate)),
    totalAmount, 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const newDocSnap = await getDoc(docRef);
  return transformDocument<Sale>(newDocSnap);
}

export async function updateSale(saleId: string, saleData: SaleFormValues): Promise<void> {
  const saleRef = doc(db, "sales", saleId);
  const subTotal = saleData.quantityKgSold * saleData.pricePerKg;
  const totalAmount = subTotal - (saleData.discountAmount || 0);

  const updatePayload: any = { ...saleData, updatedAt: serverTimestamp(), totalAmount };
   if (saleData.saleDate instanceof Date) {
    updatePayload.saleDate = Timestamp.fromDate(saleData.saleDate);
  } else {
    updatePayload.saleDate = Timestamp.fromDate(new Date(saleData.saleDate as string));
  }

  await updateDoc(saleRef, updatePayload);
}


export async function getAllSales(): Promise<Sale[]> {
  const q = query(collection(db, "sales"), orderBy("saleDate", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => transformDocument<Sale>(docSnap));
}


export async function getSalesByBatchId(batchId: string): Promise<Sale[]> {
  const salesRef = collection(db, "sales");
  // Query without server-side ordering to avoid composite index
  const q = query(salesRef, where("batchId", "==", batchId));
  const querySnapshot = await getDocs(q);
  const sales = querySnapshot.docs.map(doc => transformDocument<Sale>(doc));
  // Client-side sorting
  return sales.sort((a, b) => compareDesc(parseISO(a.saleDate), parseISO(b.saleDate)));
}

export async function getSalesByCustomerId(customerId: string): Promise<Sale[]> {
  const salesRef = collection(db, "sales");
  // Query without server-side ordering
  const q = query(salesRef, where("customerId", "==", customerId));
  const querySnapshot = await getDocs(q);
  const sales = querySnapshot.docs.map(doc => transformDocument<Sale>(doc));
  // Client-side sorting
  return sales.sort((a, b) => compareDesc(parseISO(a.saleDate), parseISO(b.saleDate)));
}

export async function updateSalePaymentStatus(saleId: string, status: 'paid' | 'unpaid'): Promise<void> {
  const saleRef = doc(db, "sales", saleId);
  await updateDoc(saleRef, { paymentStatus: status, updatedAt: serverTimestamp() });
}

export async function deleteSale(id: string): Promise<void> {
  const saleRef = doc(db, "sales", id);
  await deleteDoc(saleRef);
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const docRef = doc(db, "sales", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? transformDocument<Sale>(docSnap) : null;
}

// --- Expense Functions ---
export async function addExpense(expenseData: ExpenseFormValues): Promise<Expense> {
  const dataToSave: any = {
    ...expenseData,
    expenseDate: Timestamp.fromDate(new Date(expenseData.expenseDate)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (!expenseData.batchId) { 
    delete dataToSave.batchId;
  }
  const docRef = await addDoc(collection(db, "expenses"), dataToSave);
  const newDocSnap = await getDoc(docRef);
  return transformDocument<Expense>(newDocSnap);
}

export async function getExpenses(): Promise<Expense[]> {
  const q = query(collection(db, "expenses"), orderBy("expenseDate", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => transformDocument<Expense>(docSnap));
}

export async function getExpensesByBatchId(batchId: string): Promise<Expense[]> {
  const expensesRef = collection(db, "expenses");
  // Query without server-side ordering
  const q = query(expensesRef, where("batchId", "==", batchId));
  const querySnapshot = await getDocs(q);
  const expenses = querySnapshot.docs.map(docSnap => transformDocument<Expense>(docSnap));
  // Client-side sorting
  return expenses.sort((a, b) => compareDesc(parseISO(a.expenseDate), parseISO(b.expenseDate)));
}

export async function updateExpense(id: string, updates: Partial<ExpenseFormValues>): Promise<void> {
  const expenseRef = doc(db, "expenses", id);
  const updateData: any = { ...updates, updatedAt: serverTimestamp() };

  if (updates.expenseDate && typeof updates.expenseDate === 'string') {
    updateData.expenseDate = Timestamp.fromDate(new Date(updates.expenseDate));
  } else if (updates.expenseDate instanceof Date) {
     updateData.expenseDate = Timestamp.fromDate(updates.expenseDate);
  }
  
  if (updates.hasOwnProperty('batchId')) { 
    if (updates.batchId) {
      updateData.batchId = updates.batchId;
    } else {
      updateData.batchId = null; 
    }
  }

  await updateDoc(expenseRef, updateData);
}

export async function deleteExpense(id: string): Promise<void> {
  const expenseRef = doc(db, "expenses", id);
  await deleteDoc(expenseRef);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const docRef = doc(db, "expenses", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? transformDocument<Expense>(docSnap) : null;
}


    
