
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { BatchSchema, type BatchFormValues } from "@/lib/schemas";
import type { Batch } from "@/types";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/components/icons";
import { useState, useEffect } from "react";

interface AddBatchFormProps {
  onSubmit: (data: BatchFormValues) => Promise<void>;
  initialData?: Partial<Batch>; 
  onClose: () => void;
  isEditMode?: boolean;
}

export function AddBatchForm({ onSubmit, initialData, onClose, isEditMode = false }: AddBatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultValues = {
    name: initialData?.name || "",
    vegetableType: initialData?.vegetableType || "",
    purchaseDate: initialData?.purchaseDate ? new Date(initialData.purchaseDate) : new Date(),
    quantityKg: initialData?.quantityKg || 0,
    purchasePricePerKg: initialData?.purchasePricePerKg || 0,
    purchaseDiscountAmount: initialData?.purchaseDiscountAmount || 0,
    // transportCharges, laborCharges, otherBatchExpenses removed
    status: initialData?.status || "open",
  };

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(BatchSchema),
    defaultValues: defaultValues,
  });

  const quantityKg = form.watch("quantityKg");
  const purchasePricePerKg = form.watch("purchasePricePerKg");
  const purchaseDiscountAmount = form.watch("purchaseDiscountAmount");

  const [grossPurchaseCost, setGrossPurchaseCost] = useState(0);
  const [netPurchaseCost, setNetPurchaseCost] = useState(0);

  useEffect(() => {
    const qty = parseFloat(quantityKg?.toString() || "0");
    const price = parseFloat(purchasePricePerKg?.toString() || "0");
    const discount = parseFloat(purchaseDiscountAmount?.toString() || "0");
    
    const currentGrossCost = qty * price;
    setGrossPurchaseCost(currentGrossCost);

    const currentNetCost = currentGrossCost - discount;
    setNetPurchaseCost(currentNetCost);
    
  }, [quantityKg, purchasePricePerKg, purchaseDiscountAmount]);


  const handleSubmit = async (data: BatchFormValues) => {
    setIsSubmitting(true);
    await onSubmit(data);
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batch Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Nashik Onions - Lot 1" {...field} />
              </FormControl>
              <FormDescription>A descriptive name for this batch.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vegetableType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vegetable Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Onion, Potato" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Purchase Date</FormLabel>
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
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
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
            name="quantityKg"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Quantity (KG)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 1000" {...field} step="any" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="purchasePricePerKg"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Purchase Price (₹/KG)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 20" {...field} step="any" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="purchaseDiscountAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Discount Amount (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 100" {...field} step="any"/>
              </FormControl>
              <FormDescription>Total discount received on this purchase.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Removed transport, labor, other expenses fields */}

        <div className="space-y-1 text-sm p-3 bg-muted/50 rounded-md">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Purchase Cost:</span>
                <span>₹{grossPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {parseFloat(purchaseDiscountAmount?.toString() || "0") > 0 && (
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount Received:</span>
                    <span>- ₹{parseFloat(purchaseDiscountAmount.toString() || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            )}
            <div className="flex justify-between font-semibold text-base">
                <span className="text-muted-foreground">Net Purchase Cost:</span>
                <span className="text-primary">₹{netPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>

         <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto" disabled={isSubmitting}>
             {isSubmitting && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Batch" : "Create Batch"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
