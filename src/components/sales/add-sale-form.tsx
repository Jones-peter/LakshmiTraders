
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SaleSchema, type SaleFormValues } from "@/lib/schemas";
import type { Sale, Customer, Batch, BaseFormProps } from "@/types"; // Added Batch type
import { CalendarIcon, Package } from "lucide-react"; // Added Package icon
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Icons } from "@/components/icons";

export interface AvailableBatchInfo {
  id: string;
  name: string;
  vegetableType: string;
  remainingQuantity: number;
  initialQuantity: number; // For reference or fallback if remainingQuantity is complex to get everywhere
}

interface AddSaleFormProps extends BaseFormProps<SaleFormValues> {
  availableCustomers: Customer[];
  
  // Option 1: Used from a specific batch context (e.g., BatchDetailPage)
  batchIdContext?: string; // The fixed batchId
  batchNameContext?: string; // Name of the fixed batch
  maxQuantityContext?: number; // The pre-calculated remaining quantity for the fixed batch

  // Option 2: Used from a general context (e.g., SalesPage)
  availableBatchesForForm?: AvailableBatchInfo[];
}

export function AddSaleForm({ 
  onSubmit, 
  initialData, 
  availableCustomers, 
  onClose, 
  isEditMode, 
  currentSale,
  batchIdContext,
  batchNameContext,
  maxQuantityContext,
  availableBatchesForForm,
}: AddSaleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Determine the effective max quantity for validation based on context
  const [effectiveMaxQuantity, setEffectiveMaxQuantity] = useState<number | undefined>(
    batchIdContext ? maxQuantityContext : undefined
  );

  const defaultVals: SaleFormValues = isEditMode && currentSale ? {
    batchId: currentSale.batchId,
    customerId: currentSale.customerId,
    saleDate: new Date(currentSale.saleDate),
    quantityKgSold: currentSale.quantityKgSold,
    pricePerKg: currentSale.pricePerKg,
    discountAmount: currentSale.discountAmount || 0,
    paymentStatus: currentSale.paymentStatus,
    notes: currentSale.notes || "",
  } : {
    batchId: batchIdContext || initialData?.batchId || "",
    customerId: initialData?.customerId || "",
    saleDate: initialData?.saleDate ? new Date(initialData.saleDate) : new Date(),
    quantityKgSold: initialData?.quantityKgSold || 0,
    pricePerKg: initialData?.pricePerKg || 0,
    discountAmount: initialData?.discountAmount || 0,
    paymentStatus: initialData?.paymentStatus || "unpaid",
    notes: initialData?.notes || "",
  };

  // Dynamically create the schema for Zod resolver
  const getSaleFormSchema = (maxQty?: number) => SaleSchema.extend({
    quantityKgSold: maxQty !== undefined
      ? SaleSchema.shape.quantityKgSold.max(maxQty, { message: `Cannot sell more than available ${maxQty} kg.` })
      : SaleSchema.shape.quantityKgSold,
  });

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(getSaleFormSchema(effectiveMaxQuantity)),
    defaultValues: defaultVals,
    // Re-validate the whole form if the effectiveMaxQuantity changes, useful if schema changes
    // context: { effectiveMaxQuantity } // if resolver needed context, not directly supported by zodResolver
  });
  
  // Watch batchId to update max quantity if we are in general sales context
  const watchedBatchId = form.watch("batchId");

  useEffect(() => {
    if (batchIdContext) { // Context from Batch Detail Page
      setEffectiveMaxQuantity(maxQuantityContext);
      // Ensure batchId is set correctly if in edit mode from batch detail
      if (isEditMode && currentSale && currentSale.batchId !== batchIdContext) {
         form.setValue('batchId', currentSale.batchId, { shouldValidate: true });
      } else if (!isEditMode && form.getValues('batchId') !== batchIdContext) {
         form.setValue('batchId', batchIdContext, { shouldValidate: true });
      }
    } else if (availableBatchesForForm) { // Context from General Sales Page
      const selectedBatchInfo = availableBatchesForForm.find(b => b.id === watchedBatchId);
      setEffectiveMaxQuantity(selectedBatchInfo?.remainingQuantity);
    }
  }, [watchedBatchId, availableBatchesForForm, batchIdContext, maxQuantityContext, form, isEditMode, currentSale]);

  // Re-create resolver when effectiveMaxQuantity changes to update validation rule
   useEffect(() => {
    form.reset(form.getValues(), {
      // @ts-ignore zodResolver should be compatible
      resolver: zodResolver(getSaleFormSchema(effectiveMaxQuantity)), 
    });
    // Trigger validation for quantityKgSold after schema update if it was touched or form submitted
    if (form.formState.isSubmitted || form.getFieldState('quantityKgSold').isTouched) {
      form.trigger('quantityKgSold');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMaxQuantity]); // form added to dep array was causing issues, removed. Re-evaluate if needed.


  const quantityKgSold = form.watch("quantityKgSold");
  const pricePerKg = form.watch("pricePerKg");
  const discountAmount = form.watch("discountAmount");

  const [subTotal, setSubTotal] = useState(0);
  const [netPayable, setNetPayable] = useState(0);

  useEffect(() => {
    const qty = parseFloat(quantityKgSold?.toString() || "0");
    const price = parseFloat(pricePerKg?.toString() || "0");
    const discount = parseFloat(discountAmount?.toString() || "0");

    const currentSubTotal = qty * price;
    setSubTotal(currentSubTotal);
    setNetPayable(currentSubTotal - discount);
  }, [quantityKgSold, pricePerKg, discountAmount]);

  const handleSubmit = async (data: SaleFormValues) => {
    setIsSubmitting(true);
    await onSubmit(data); 
    setIsSubmitting(false);
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {batchIdContext && batchNameContext && (
           <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium">Selling from Batch: <span className="text-primary">{batchNameContext}</span></p>
                {effectiveMaxQuantity !== undefined && <p className="text-xs text-muted-foreground">Max available: {effectiveMaxQuantity} kg</p>}
            </div>
        )}

        {!batchIdContext && availableBatchesForForm && (
          <FormField
            control={form.control}
            name="batchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  const selectedBatch = availableBatchesForForm.find(b => b.id === value);
                  setEffectiveMaxQuantity(selectedBatch?.remainingQuantity);
                }} 
                defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a batch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableBatchesForForm.map((batchInfo) => (
                      <SelectItem key={batchInfo.id} value={batchInfo.id} disabled={batchInfo.remainingQuantity <= 0 && !isEditMode}>
                        {batchInfo.name} ({batchInfo.vegetableType}) - Avail: {batchInfo.remainingQuantity} kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="saleDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sale Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value instanceof Date ? field.value : new Date(field.value) }
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantityKgSold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity Sold (KG)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 50" {...field} step="any" />
                </FormControl>
                {effectiveMaxQuantity !== undefined && !isEditMode && <FormDescription>Max available: {effectiveMaxQuantity} kg</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pricePerKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price (₹/KG)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 25" {...field} step="any"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
            control={form.control}
            name="discountAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Amount (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 50" {...field} step="any"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        
        <div className="space-y-1 text-sm p-3 bg-muted/50 rounded-md">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {parseFloat(discountAmount?.toString() || "0") > 0 && (
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount Given:</span>
                    <span>- ₹{parseFloat(discountAmount.toString() || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            )}
            <div className="flex justify-between font-semibold text-base">
                <span className="text-muted-foreground">Net Payable:</span>
                <span className="text-primary">₹{netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>


        <FormField
          control={form.control}
          name="paymentStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any specific notes about this sale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Hidden field for batchId if context is provided and form field isn't rendered */}
        {batchIdContext && <input type="hidden" {...form.register("batchId")} value={batchIdContext} />}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Sale" : "Record Sale"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

