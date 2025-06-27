"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { customerColumnsFunction } from "@/components/customers/customer-columns";
import type { Customer } from "@/types";
import { getCustomers, addCustomer as fbAddCustomer } from "@/lib/firebase/firestore";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddCustomerForm } from "@/components/customers/add-customer-form";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import type { z } from "zod";
import type { CustomerSchema } from "@/lib/schemas";

type CustomerFormValues = z.infer<typeof CustomerSchema>;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedCustomers = await getCustomers();
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch customers." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleAddCustomer = async (data: CustomerFormValues) => {
    try {
      await fbAddCustomer(data);
      toast({ title: "Success", description: "Customer added successfully." });
      setIsFormOpen(false);
      await loadCustomers(); // Refresh list
    } catch (error) {
      console.error("Failed to add customer:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add customer." });
    }
  };

  const columns = useMemo(() => customerColumnsFunction(loadCustomers), [loadCustomers]);

  if (isLoading) {
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Customer Management</h1>
            <p className="text-muted-foreground">View and manage your customer list.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Enter the details for the new customer. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <AddCustomerForm onSubmit={handleAddCustomer} onClose={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={customers} searchKey="name" searchPlaceholder="Search by customer name..."/>
      </div>
    </MainLayout>
  );
}
