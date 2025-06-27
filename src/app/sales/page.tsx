
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { saleColumnsFunction } from "@/components/sales/sale-columns";
import type { Sale, Customer, Batch } from "@/types";
import { 
  getAllSales, 
  addSale as fbAddSale, 
  updateSale as fbUpdateSale, 
  getCustomers, 
  getOpenBatches, // Use getOpenBatches
  getBatchById // To fetch full batch details for invoice if needed
} from "@/lib/firebase/firestore";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddSaleForm, type AvailableBatchInfo } from "@/components/sales/add-sale-form";
import { InvoiceDialog } from "@/components/sales/invoice-dialog";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import type { SaleFormValues } from "@/lib/schemas";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openBatches, setOpenBatches] = useState<Batch[]>([]);
  const [allBatchesForContext, setAllBatchesForContext] = useState<Batch[]>([]);


  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<Customer | null>(null);
  const [selectedBatchForInvoice, setSelectedBatchForInvoice] = useState<Batch | null>(null);

  const { toast } = useToast();

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedSales, fetchedCustomers, fetchedOpenBatches] = await Promise.all([
        getAllSales(),
        getCustomers(),
        getOpenBatches(),
      ]);
      setSales(fetchedSales || []);
      setCustomers(fetchedCustomers || []);
      setOpenBatches(fetchedOpenBatches || []);
      setAllBatchesForContext(fetchedOpenBatches || []); // Initially, open batches are all we might show in dropdown. If we need ALL batches for invoice context, fetch getBatches()
    } catch (error) {
      console.error("Failed to fetch sales data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch sales data." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const availableBatchesForSaleForm: AvailableBatchInfo[] = useMemo(() => {
    return openBatches.map(batch => {
      const soldFromThisBatch = sales
        .filter(s => s.batchId === batch.id)
        .reduce((sum, s) => sum + s.quantityKgSold, 0);
      const remainingQuantity = batch.quantityKg - soldFromThisBatch;
      return {
        id: batch.id,
        name: batch.name,
        vegetableType: batch.vegetableType,
        remainingQuantity: remainingQuantity > 0 ? remainingQuantity : 0,
        initialQuantity: batch.quantityKg
      };
    });
  }, [openBatches, sales]);

  const handleAddSale = async (data: SaleFormValues) => {
    const selectedBatchInfo = availableBatchesForSaleForm.find(b => b.id === data.batchId);
    if (selectedBatchInfo && data.quantityKgSold > selectedBatchInfo.remainingQuantity) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Cannot sell more than available ${selectedBatchInfo.remainingQuantity} kg for ${selectedBatchInfo.name}.`
        });
        return;
    }

    try {
      await fbAddSale(data);
      toast({ title: "Success", description: "Sale recorded successfully." });
      setIsAddFormOpen(false);
      await loadInitialData(); 
    } catch (error) {
      console.error("Failed to add sale:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not record sale." });
    }
  };

  const handleUpdateSale = async (data: SaleFormValues) => {
    if (!editingSale) return;
    // Similar check for edit if quantity changes, though more complex if batch changes.
    // For now, assuming batch doesn't change in edit or validation handles it.
    try {
      await fbUpdateSale(editingSale.id, data);
      toast({ title: "Success", description: "Sale updated successfully." });
      setIsEditFormOpen(false);
      setEditingSale(null);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to update sale:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update sale." });
    }
  };
  
  const openEditForm = (sale: Sale) => {
    setEditingSale(sale);
    setIsEditFormOpen(true);
  };

  const openInvoiceDialog = async (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId) || null;
    const batch = allBatchesForContext.find(b => b.id === sale.batchId) || await getBatchById(sale.batchId); // Fallback to fetch if not in openBatches
    
    setSelectedSaleForInvoice(sale);
    setSelectedCustomerForInvoice(customer);
    setSelectedBatchForInvoice(batch); 
    setIsInvoiceDialogOpen(true);
  };

  const columns = useMemo(() => saleColumnsFunction(
    customers, 
    allBatchesForContext, // Pass all batches that might be relevant for displaying names
    openEditForm, 
    openInvoiceDialog,
    loadInitialData // For refresh
  ), [customers, allBatchesForContext, loadInitialData]);


  if (isLoading && sales.length === 0) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <Icons.Spinner className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Sales Management</h1>
            <p className="text-muted-foreground">Record and manage all sales transactions.</p>
          </div>
          <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Sale</DialogTitle>
                <DialogDescription>
                  Enter the details for the new sale. Select batch and customer.
                </DialogDescription>
              </DialogHeader>
              <AddSaleForm 
                onSubmit={handleAddSale} 
                availableCustomers={customers}
                availableBatchesForForm={availableBatchesForSaleForm}
                onClose={() => setIsAddFormOpen(false)} 
                isEditMode={false}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading && sales.length > 0 ? (
           <div className="flex justify-center py-4">
             <Icons.Spinner className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : (
          <DataTable columns={columns} data={sales} searchKey="customerId" searchPlaceholder="Search by customer or batch..."/>
        )}

        {isEditFormOpen && editingSale && (
          <Dialog open={isEditFormOpen} onOpenChange={(isOpen) => {
            setIsEditFormOpen(isOpen);
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
                availableBatchesForForm={availableBatchesForSaleForm} // Provide for consistency, though batch might be fixed for edit
                batchIdContext={editingSale.batchId} // Pre-select and fix batch for editing context
                maxQuantityContext={
                    availableBatchesForSaleForm.find(b => b.id === editingSale.batchId)?.remainingQuantity 
                    // Add current sale's quantity back to remaining for editing context
                    + (availableBatchesForSaleForm.find(b => b.id === editingSale.batchId) ? editingSale.quantityKgSold : 0) 
                }
                onClose={() => { setIsEditFormOpen(false); setEditingSale(null); }}
                currentSale={editingSale}
                isEditMode={true}
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
      </div>
    </MainLayout>
  );
}
