
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { saleColumnsFunction } from "@/components/sales/sale-columns"; // Reusing sale columns
import type { Customer, Sale, Batch } from "@/types";
import { 
  getCustomerById, 
  getSalesByCustomerId, 
  getBatches, 
  updateSalePaymentStatus,
  getSaleById,
  updateSale as fbUpdateSale, // Renamed to avoid conflict
  getBatchById,
  getAllSales // Needed to calculate remaining quantities for batches
} from "@/lib/firebase/firestore";
import { ArrowLeft, User, Phone, Mail, MapPin, IndianRupee, ShoppingBag, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils"; 
import { AddSaleForm, type AvailableBatchInfo } from "@/components/sales/add-sale-form";
import { InvoiceDialog } from "@/components/sales/invoice-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SaleFormValues } from "@/lib/schemas";


export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]); 
  const [allSalesData, setAllSalesData] = useState<Sale[]>([]); // To calculate remaining quantities
  const [isLoading, setIsLoading] = useState(true);

  const [isEditSaleFormOpen, setIsEditSaleFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [selectedBatchForInvoice, setSelectedBatchForInvoice] = useState<Batch | null>(null);


  const refreshPageData = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const [fetchedCustomer, fetchedCustomerSales, fetchedAllBatches, fetchedAllSales] = await Promise.all([
        getCustomerById(customerId),
        getSalesByCustomerId(customerId),
        getBatches(),
        getAllSales() 
      ]);
      
      setCustomer(fetchedCustomer);
      setSales(fetchedCustomerSales || []);
      setAllBatches(fetchedAllBatches || []);
      setAllSalesData(fetchedAllSales || []); // Store all sales data

    } catch (error) {
      console.error("Failed to fetch customer details:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch customer details." });
      router.push('/customers');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, toast, router]);

  useEffect(() => {
    refreshPageData();
  }, [refreshPageData]);

  const availableBatchesForSaleForm: AvailableBatchInfo[] = useMemo(() => {
    return allBatches.filter(b => b.status === 'open').map(batch => {
      const soldFromThisBatch = allSalesData
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
  }, [allBatches, allSalesData]);


  const handleUpdateSale = async (data: SaleFormValues) => {
    if (!editingSale) return;
    try {
      await fbUpdateSale(editingSale.id, data);
      toast({ title: "Success", description: "Sale updated successfully." });
      setIsEditSaleFormOpen(false);
      setEditingSale(null);
      await refreshPageData();
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
    const batchForInvoice = allBatches.find(b => b.id === sale.batchId) || await getBatchById(sale.batchId);
    setSelectedSaleForInvoice(sale);
    setSelectedBatchForInvoice(batchForInvoice);
    setIsInvoiceDialogOpen(true);
  };
  
  const saleColumns = useMemo(() => saleColumnsFunction(
    customer ? [customer] : [], 
    allBatches,
    openEditSaleForm,
    openInvoiceDialog,
    refreshPageData 
  ), [customer, allBatches, refreshPageData]);


  if (isLoading && !customer) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <Icons.Spinner className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!customer) {
    return (
      <MainLayout>
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold">Customer not found</h2>
          <Button onClick={() => router.push('/customers')} variant="link">Go back to Customers</Button>
        </div>
      </MainLayout>
    );
  }
  
  const totalSpent = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalPaid = sales.filter(s => s.paymentStatus === 'paid').reduce((sum, sale) => sum + sale.totalAmount, 0);
  const outstandingAmount = totalSpent - totalPaid;

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/customers')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {customer.name}
            </CardTitle>
            <CardDescription>Details for customer ID: {customer.id}</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoItem icon={Phone} label="Phone" value={customer.contactPhone || "N/A"} />
            <InfoItem icon={Mail} label="Email" value={customer.contactEmail || "N/A"} />
            <InfoItem icon={MapPin} label="Address" value={customer.address || "N/A"} />
            <InfoItem icon={ShoppingBag} label="Total Purchases Value" value={`₹${totalSpent.toLocaleString()}`} />
            <InfoItem icon={IndianRupee} label="Total Paid" value={`₹${totalPaid.toLocaleString()}`} />
            <InfoItem icon={AlertTriangle} label="Outstanding Amount" value={`₹${outstandingAmount.toLocaleString()}`} classNameValue={outstandingAmount > 0 ? "text-destructive font-semibold" : ""} />
          </CardContent>
           <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Customer since: {customer.createdAt ? format(new Date(customer.createdAt), "PPP") : 'N/A'}
            </p>
          </CardFooter>
        </Card>

        <Separator />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All sales made to {customer.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && sales.length === 0 ? (
                 <div className="flex justify-center py-4">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
            <DataTable columns={saleColumns} data={sales} searchKey="batchId" searchPlaceholder="Search by batch..." />
            )}
          </CardContent>
        </Card>

        {isEditSaleFormOpen && editingSale && (
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
                availableCustomers={customer ? [customer] : []} 
                onClose={() => { setIsEditSaleFormOpen(false); setEditingSale(null); }}
                currentSale={editingSale}
                isEditMode={true}
                batchIdContext={editingSale.batchId}
                batchNameContext={allBatches.find(b => b.id === editingSale.batchId)?.name || 'Batch'}
                maxQuantityContext={
                  (availableBatchesForSaleForm.find(b => b.id === editingSale.batchId)?.remainingQuantity ?? 0) + editingSale.quantityKgSold
                }
                availableBatchesForForm={availableBatchesForSaleForm} // Provide for potential (though unlikely) batch change in edit
              />
            </DialogContent>
          </Dialog>
        )}

        {isInvoiceDialogOpen && selectedSaleForInvoice && customer && selectedBatchForInvoice && (
          <InvoiceDialog
            isOpen={isInvoiceDialogOpen}
            onOpenChange={setIsInvoiceDialogOpen}
            sale={selectedSaleForInvoice}
            customer={customer} 
            batch={selectedBatchForInvoice}
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

