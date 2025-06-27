
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { saleColumnsFunction } from "@/components/sales/sale-columns";
import { expenseColumnsFunction } from "@/components/expenses/expense-columns";
import type { Batch, Sale, Customer, Expense } from "@/types";
import { 
  getBatchById, 
  getSalesByBatchId, 
  updateBatch as fbUpdateBatch, 
  addSale as fbAddSale, 
  getCustomers, 
  updateSalePaymentStatus,
  updateSale as fbUpdateSale,
  getSaleById,
  getExpensesByBatchId, 
  addExpense as fbAddExpense, 
  updateExpense as fbUpdateExpense 
} from "@/lib/firebase/firestore";
import { ArrowLeft, PlusCircle, CheckCircle, XCircle, Package, CalendarDays, Scale, IndianRupee, ListOrdered, Tag, Banknote, Receipt, Edit as EditIcon, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddSaleForm } from "@/components/sales/add-sale-form";
import { InvoiceDialog } from "@/components/sales/invoice-dialog";
import type { SaleFormValues, BatchFormValues, ExpenseFormValues } from "@/lib/schemas";
import { AddBatchForm } from "@/components/batches/add-batch-form";
import { AddExpenseForm } from "@/components/expenses/add-expense-form"; 
import { BatchReportDialog } from "@/components/batches/batch-report-dialog";
import { cn } from "@/lib/utils";

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.batchId as string;
  const { toast } = useToast();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batchExpenses, setBatchExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  
  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = useState(false);
  const [isEditSaleFormOpen, setIsEditSaleFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<Customer | null>(null);
  const [selectedBatchForInvoice, setSelectedBatchForInvoice] = useState<Batch | null>(null);

  const [isEditBatchFormOpen, setIsEditBatchFormOpen] = useState(false);
  const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = useState(false); 
  const [isEditExpenseFormOpen, setIsEditExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isBatchReportDialogOpen, setIsBatchReportDialogOpen] = useState(false); 


  const loadSalesData = useCallback(async () => {
    if (!batchId) return;
    try {
      const fetchedSales = await getSalesByBatchId(batchId); 
      setSales(fetchedSales || []);
    } catch (error) {
      console.error("Failed to refresh sales data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not refresh sales data." });
    }
  }, [batchId, toast]);

  const loadBatchExpensesData = useCallback(async () => {
    if (!batchId) return;
    setIsLoadingExpenses(true);
    try {
      const fetchedExpenses = await getExpensesByBatchId(batchId);
      setBatchExpenses(fetchedExpenses || []);
    } catch (error) {
      console.error("Failed to load batch expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load batch expenses." });
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [batchId, toast]);
  
  const loadBatchDetails = useCallback(async () => {
    if (!batchId) return;
    setIsLoading(true); 
    try {
      const [fetchedBatch, fetchedCustomers] = await Promise.all([
        getBatchById(batchId),
        getCustomers()
      ]);
      
      setBatch(fetchedBatch);
      setCustomers(fetchedCustomers || []);
      if (fetchedBatch) { 
        await loadSalesData(); 
        await loadBatchExpensesData(); 
      }

    } catch (error) {
      console.error("Failed to fetch batch details:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch batch details." });
      router.push('/batches'); 
    } finally {
      setIsLoading(false);
    }
  }, [batchId, toast, router, loadSalesData, loadBatchExpensesData]);


  useEffect(() => {
    loadBatchDetails();
  }, [loadBatchDetails]);
  
  const totalSoldKg = useMemo(() => sales.reduce((sum, sale) => sum + sale.quantityKgSold, 0), [sales]);
  const remainingKg = useMemo(() => batch ? batch.quantityKg - totalSoldKg : 0, [batch, totalSoldKg]);

  const handleAddSale = async (data: SaleFormValues) => {
    if (!batch) return;
     if (data.quantityKgSold > remainingKg) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Cannot sell more than available ${remainingKg} kg.`
        });
        return;
    }
    try {
      await fbAddSale(data); 
      toast({ title: "Success", description: "Sale recorded successfully." });
      setIsAddSaleFormOpen(false);
      await loadSalesData(); // This will also update `totalSoldKg` and `remainingKg` via useMemo
      await loadBatchDetails(); // Re-fetch batch details to update related calcs
    } catch (error) {
      console.error("Failed to add sale:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not record sale." });
    }
  };

  const handleUpdateSale = async (data: SaleFormValues) => {
    if (!editingSale || !batch) return;

    // Calculate effective remaining quantity for validation if quantity is changed
    const quantityChange = data.quantityKgSold - editingSale.quantityKgSold;
    const effectiveRemainingForEdit = remainingKg + editingSale.quantityKgSold; // Max this sale could have been

    if (data.quantityKgSold > effectiveRemainingForEdit) {
         toast({
            variant: "destructive",
            title: "Error",
            description: `Cannot update sale quantity beyond available stock for this batch (${effectiveRemainingForEdit} kg).`
        });
        return;
    }

    try {
      await fbUpdateSale(editingSale.id, data);
      toast({ title: "Success", description: "Sale updated successfully." });
      setIsEditSaleFormOpen(false);
      setEditingSale(null);
      await loadSalesData(); // Refresh sales and recalculate remainingKg
      await loadBatchDetails();
    } catch (error) {
      console.error("Failed to update sale:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update sale." });
    }
  };

  const openEditSaleForm = (sale: Sale) => {
    setEditingSale(sale);
    setIsEditSaleFormOpen(true);
  };

  const openInvoiceDialog = async (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId) || null;
    setSelectedSaleForInvoice(sale);
    setSelectedCustomerForInvoice(customer);
    setSelectedBatchForInvoice(batch); 
    setIsInvoiceDialogOpen(true);
  };

  const handleToggleBatchStatus = async () => {
    if (!batch) return;
    const newStatus = batch.status === 'open' ? 'closed' : 'open';
    try {
      await fbUpdateBatch(batch.id, { status: newStatus });
      setBatch(prev => prev ? { ...prev, status: newStatus } : null);
      toast({ title: "Success", description: `Batch marked as ${newStatus}.` });
    } catch (error) {
      console.error("Failed to update batch status:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update batch status." });
    }
  };

  const handleUpdateBatch = async (data: BatchFormValues) => {
    if (!batch) return;
    try {
      await fbUpdateBatch(batch.id, data);
      toast({ title: "Success", description: "Batch updated successfully." });
      setIsEditBatchFormOpen(false);
      await loadBatchDetails(); 
    } catch (error) {
      console.error("Failed to update batch:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update batch." });
    }
  };

  const handleAddExpenseForBatch = async (data: ExpenseFormValues) => {
    if (!batch) return;
    try {
      await fbAddExpense({ ...data, batchId: batch.id });
      toast({ title: "Success", description: "Expense added to batch successfully." });
      setIsAddExpenseFormOpen(false);
      await loadBatchExpensesData(); 
      await loadBatchDetails(); // Re-fetch batch to update total effective cost
    } catch (error) {
      console.error("Failed to add expense to batch:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add expense to batch." });
    }
  };

  const handleUpdateExpenseForBatch = async (data: ExpenseFormValues) => {
    if (!editingExpense) return;
    try {
        await fbUpdateExpense(editingExpense.id, data);
        toast({ title: "Success", description: "Expense updated successfully."});
        setIsEditExpenseFormOpen(false);
        setEditingExpense(null);
        await loadBatchExpensesData();
        await loadBatchDetails(); 
    } catch (error) {
        console.error("Failed to update expense:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not update expense."});
    }
  };

  const openEditExpenseForm = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditExpenseFormOpen(true);
  };


  const saleColumns = useMemo(() => saleColumnsFunction(
    customers, 
    [batch as Batch].filter(Boolean), 
    openEditSaleForm,
    openInvoiceDialog,
    loadSalesData 
  ), [customers, batch, loadSalesData]);

  const batchExpenseColumns = useMemo(() => expenseColumnsFunction(
      loadBatchExpensesData, 
      openEditExpenseForm 
  ), [loadBatchExpensesData, openEditExpenseForm]);


  if (isLoading && !batch) { 
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <Icons.Spinner className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!batch) {
    return (
      <MainLayout>
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold">Batch not found</h2>
          <Button onClick={() => router.push('/batches')} variant="link">Go back to Batches</Button>
        </div>
      </MainLayout>
    );
  }
  
  const totalRevenueFromSales = sales.filter(s => s.paymentStatus === 'paid').reduce((sum, sale) => sum + sale.totalAmount, 0);

  const purchaseDiscount = batch.purchaseDiscountAmount || 0;
  const netPurchaseCost = batch.totalPurchaseCost - purchaseDiscount;

  const totalBatchLinkedExpenses = batchExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalEffectiveBatchCost = netPurchaseCost + totalBatchLinkedExpenses;


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => router.push('/batches')} className="mb-4 sm:mb-0">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsBatchReportDialogOpen(true)} variant="outline" className="mb-4 sm:mb-0">
                  <FileText className="mr-2 h-4 w-4" /> Generate Batch Report
              </Button>
              <Button onClick={() => setIsEditBatchFormOpen(true)} variant="outline" className="mb-4 sm:mb-0">
                  <EditIcon className="mr-2 h-4 w-4" /> Edit Batch Details
              </Button>
            </div>
        </div>
        

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                {batch.name}
              </CardTitle>
              <CardDescription>Details for batch ID: {batch.id}</CardDescription>
            </div>
            <Badge variant={batch.status === "open" ? "default" : "secondary"} className="text-sm px-3 py-1 self-start sm:self-auto">
              {batch.status === "open" ? <CheckCircle className="mr-1 h-4 w-4" /> : <XCircle className="mr-1 h-4 w-4" />}
              {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
            </Badge>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <InfoItem icon={ListOrdered} label="Vegetable Type" value={batch.vegetableType} />
            <InfoItem icon={CalendarDays} label="Purchase Date" value={format(parseISO(batch.purchaseDate), "PPP")} />
            <InfoItem icon={Scale} label="Initial Quantity" value={`${batch.quantityKg.toLocaleString()} kg`} />
            <InfoItem icon={IndianRupee} label="Purchase Price/kg" value={`₹${batch.purchasePricePerKg.toLocaleString()}`} />
            <InfoItem icon={IndianRupee} label="Gross Purchase Cost" value={`₹${batch.totalPurchaseCost.toLocaleString()}`} />
            <InfoItem icon={Tag} label="Purchase Discount" value={`₹${purchaseDiscount.toLocaleString()}`} />
            <InfoItem icon={IndianRupee} label="Net Purchase Cost" value={`₹${netPurchaseCost.toLocaleString()}`} />
            
            <InfoItem icon={Receipt} label="Total Batch-Specific Expenses" value={`₹${totalBatchLinkedExpenses.toLocaleString()}`} />
            
            <InfoItem icon={Banknote} label="Total Effective Batch Cost" value={`₹${totalEffectiveBatchCost.toLocaleString()}`} classNameValue="font-bold text-primary md:col-span-2 lg:col-span-1"/>
            
            <Separator className="md:col-span-2 lg:col-span-3 my-2"/>

            <InfoItem icon={Scale} label="Total Sold" value={`${totalSoldKg.toLocaleString()} kg`} />
            <InfoItem icon={Scale} label="Remaining Quantity" value={`${remainingKg.toLocaleString()} kg`} />
            <InfoItem icon={IndianRupee} label="Paid Revenue from Sales" value={`₹${totalRevenueFromSales.toLocaleString()}`} />

          </CardContent>
          <CardFooter className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-2">
             <Button onClick={handleToggleBatchStatus} variant="outline" className="w-full sm:w-auto">
              {batch.status === 'open' ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Mark as {batch.status === 'open' ? 'Closed' : 'Open'}
            </Button>
          </CardFooter>
        </Card>

        <Separator />

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle>Batch Specific Expenses</CardTitle>
                <CardDescription>Expenses directly associated with batch {batch.name}.</CardDescription>
            </div>
            <Dialog open={isAddExpenseFormOpen} onOpenChange={setIsAddExpenseFormOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense for this Batch
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Expense for Batch: {batch.name}</DialogTitle>
                        <DialogDescription>Enter details for the new expense.</DialogDescription>
                    </DialogHeader>
                    <AddExpenseForm
                        onSubmit={handleAddExpenseForBatch}
                        onClose={() => setIsAddExpenseFormOpen(false)}
                        isEditMode={false}
                        batchId={batch.id} 
                        batchName={batch.name} 
                    />
                </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
             {isLoadingExpenses ? (
                <div className="flex justify-center py-4"><Icons.Spinner className="h-8 w-8 animate-spin text-primary" /></div>
             ) : (
                <DataTable columns={batchExpenseColumns} data={batchExpenses} searchKey="description" searchPlaceholder="Search expenses..."/>
             )}
          </CardContent>
        </Card>
        
        <Separator />

        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Sales from this Batch</CardTitle>
              <CardDescription>All sales recorded under batch {batch.name}.</CardDescription>
            </div>
             {batch.status === 'open' && (
              <Dialog open={isAddSaleFormOpen} onOpenChange={setIsAddSaleFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto" disabled={remainingKg <=0 && !isEditMode}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Sale
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Record New Sale</DialogTitle>
                    <DialogDescription>
                      Enter details for the new sale from batch: {batch.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <AddSaleForm 
                    onSubmit={handleAddSale} 
                    availableCustomers={customers}
                    onClose={() => setIsAddSaleFormOpen(false)}
                    isEditMode={false}
                    batchIdContext={batch.id} // Pass fixed batchId
                    batchNameContext={batch.name}
                    maxQuantityContext={remainingKg > 0 ? remainingKg : 0} // Pass calculated remaining quantity
                  />
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && sales.length === 0 ? (
                <div className="flex justify-center py-4">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
             <DataTable columns={saleColumns} data={sales} searchKey="customerId" searchPlaceholder="Search by customer..." />
            )}
          </CardContent>
        </Card>

        {isEditSaleFormOpen && editingSale && batch && (
          <Dialog open={isEditSaleFormOpen} onOpenChange={(isOpen) => {
            setIsEditSaleFormOpen(isOpen);
            if (!isOpen) setEditingSale(null);
          }}>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Sale</DialogTitle>
                <DialogDescription>
                  Update sale details for ID: {editingSale.id}.
                </DialogDescription>
              </DialogHeader>
              <AddSaleForm 
                onSubmit={handleUpdateSale} 
                availableCustomers={customers}
                onClose={() => { setIsEditSaleFormOpen(false); setEditingSale(null); }}
                currentSale={editingSale}
                isEditMode={true}
                batchIdContext={editingSale.batchId} // Fixed batchId for edit
                batchNameContext={batch.name} // Assuming editingSale's batchId corresponds to current `batch`
                maxQuantityContext={remainingKg + editingSale.quantityKgSold} // Max available for this specific sale edit
              />
            </DialogContent>
          </Dialog>
        )}

        {isEditBatchFormOpen && batch && (
          <Dialog open={isEditBatchFormOpen} onOpenChange={setIsEditBatchFormOpen}>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Batch</DialogTitle>
                <DialogDescription>
                  Update details for batch: {batch.name}.
                </DialogDescription>
              </DialogHeader>
              <AddBatchForm 
                onSubmit={handleUpdateBatch} 
                initialData={batch}
                onClose={() => setIsEditBatchFormOpen(false)}
                isEditMode={true}
              />
            </DialogContent>
          </Dialog>
        )}

        {isEditExpenseFormOpen && editingExpense && batch && (
            <Dialog open={isEditExpenseFormOpen} onOpenChange={(isOpen) => {
                setIsEditExpenseFormOpen(isOpen);
                if (!isOpen) setEditingExpense(null);
            }}>
                <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Expense for Batch: {batch.name}</DialogTitle>
                        <DialogDescription>Update expense details for ID: {editingExpense.id}.</DialogDescription>
                    </DialogHeader>
                    <AddExpenseForm
                        onSubmit={handleUpdateExpenseForBatch}
                        onClose={() => { setIsEditExpenseFormOpen(false); setEditingExpense(null); }}
                        currentExpense={editingExpense}
                        isEditMode={true}
                        batchId={batch.id} 
                        batchName={batch.name}
                    />
                </DialogContent>
            </Dialog>
        )}

        {isInvoiceDialogOpen && selectedSaleForInvoice && selectedCustomerForInvoice && selectedBatchForInvoice && (
          <InvoiceDialog
            isOpen={isInvoiceDialogOpen}
            onOpenChange={setIsInvoiceDialogOpen}
            sale={selectedSaleForInvoice}
            customer={selectedCustomerForInvoice}
            batch={selectedBatchForInvoice}
          />
        )}

        {isBatchReportDialogOpen && batch && (
          <BatchReportDialog
            isOpen={isBatchReportDialogOpen}
            onOpenChange={setIsBatchReportDialogOpen}
            batch={batch}
            sales={sales}
            batchExpenses={batchExpenses}
            customers={customers}
          />
        )}

      </div>
    </MainLayout>
  );
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  classNameValue?: string;
}
const InfoItem = ({ icon: Icon, label, value, classNameValue }: InfoItemProps) => (
  <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
    <Icon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-medium", classNameValue)}>{value}</p>
    </div>
  </div>
);

