
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { expenseColumnsFunction } from "@/components/expenses/expense-columns";
import type { Expense } from "@/types";
import { getExpenses, addExpense as fbAddExpense, updateExpense as fbUpdateExpense } from "@/lib/firebase/firestore";
import { PlusCircle, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import type { ExpenseFormValues } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { toast } = useToast();

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedExpenses = await getExpenses();
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch expenses." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleAddExpense = async (data: ExpenseFormValues) => {
    try {
      await fbAddExpense(data);
      toast({ title: "Success", description: "Expense added successfully." });
      setIsAddFormOpen(false);
      await loadExpenses(); 
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add expense." });
    }
  };

  const handleUpdateExpense = async (data: ExpenseFormValues) => {
    if (!editingExpense) return;
    try {
      await fbUpdateExpense(editingExpense.id, data);
      toast({ title: "Success", description: "Expense updated successfully." });
      setIsEditFormOpen(false);
      setEditingExpense(null);
      await loadExpenses();
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update expense." });
    }
  };
  
  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditFormOpen(true);
  };

  const columns = useMemo(() => expenseColumnsFunction(loadExpenses, openEditForm), [loadExpenses]);

  const totalExpensesThisMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  if (isLoading && expenses.length === 0) {
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Expense Management</h1>
            <p className="text-muted-foreground">Track and manage your business expenses.</p>
          </div>
          <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Enter the details for the new expense. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <AddExpenseForm 
                onSubmit={handleAddExpense} 
                onClose={() => setIsAddFormOpen(false)} 
                isEditMode={false}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Total Expenses This Month ({format(new Date(), "MMMM yyyy")})
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalExpensesThisMonth)}
                </div>
            </CardContent>
        </Card>

        {isLoading && expenses.length > 0 ? (
             <div className="flex justify-center py-4">
                 <Icons.Spinner className="h-8 w-8 animate-spin text-primary" />
             </div>
        ) : (
          <DataTable columns={columns} data={expenses} searchKey="description" searchPlaceholder="Search by description..."/>
        )}


        {isEditFormOpen && editingExpense && (
          <Dialog open={isEditFormOpen} onOpenChange={(isOpen) => {
            setIsEditFormOpen(isOpen);
            if (!isOpen) setEditingExpense(null);
          }}>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
                <DialogDescription>
                  Update details for expense: {editingExpense.description}.
                </DialogDescription>
              </DialogHeader>
              <AddExpenseForm 
                onSubmit={handleUpdateExpense} 
                currentExpense={editingExpense}
                onClose={() => { setIsEditFormOpen(false); setEditingExpense(null); }}
                isEditMode={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
