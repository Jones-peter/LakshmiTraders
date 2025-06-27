
"use client";

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
import { ExpenseSchema, type ExpenseFormValues } from "@/lib/schemas";
import type { Expense, BaseFormProps } from "@/types";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Icons } from "@/components/icons";
import { useState } from "react";

interface AddExpenseFormProps extends BaseFormProps<ExpenseFormValues> {
  currentExpense?: Expense; // For pre-filling in edit mode
  batchId?: string; // To pre-fill batchId when adding expense for a specific batch
  batchName?: string; // To display batch name if batchId is provided
}

export function AddExpenseForm({ 
  onSubmit, 
  initialData, 
  onClose, 
  isEditMode, 
  currentExpense,
  batchId,
  batchName,
}: AddExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultVals: ExpenseFormValues = isEditMode && currentExpense ? {
    description: currentExpense.description,
    amount: currentExpense.amount,
    expenseDate: new Date(currentExpense.expenseDate),
    category: currentExpense.category || "",
    batchId: currentExpense.batchId || batchId || "", // Prioritize currentExpense's batchId, then passed batchId
  } : {
    description: initialData?.description || "",
    amount: initialData?.amount || 0,
    expenseDate: initialData?.expenseDate ? new Date(initialData.expenseDate as string) : new Date(),
    category: initialData?.category || "",
    batchId: batchId || initialData?.batchId || "", // Use passed batchId if creating new for specific batch
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseSchema),
    defaultValues: defaultVals,
  });

  const handleSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    const dataToSubmit = { ...data };
    if (!dataToSubmit.batchId) { // Remove batchId if it's an empty string
        delete dataToSubmit.batchId;
    }
    await onSubmit(dataToSubmit);
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {batchId && batchName && (
            <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium">Adding expense for Batch: <span className="text-primary">{batchName}</span></p>
                <p className="text-xs text-muted-foreground">This expense will be directly associated with this batch.</p>
            </div>
        )}
         <FormField
            control={form.control}
            name="batchId"
            render={({ field }) => ( // Hidden field to carry batchId if provided
              <FormItem className="hidden">
                <FormLabel>Batch ID</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="expenseDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expense Date</FormLabel>
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Office rent, Transportation for batch X" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 500" {...field} step="any"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Utilities, Transport, Labor" {...field} />
              </FormControl>
              <FormDescription>Helps in grouping expenses for reports.</FormDescription>
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
            {isEditMode ? "Update Expense" : "Add Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
