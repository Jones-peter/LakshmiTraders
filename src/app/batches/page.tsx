
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { batchColumnsFunction } from "@/components/batches/batch-columns";
import type { Batch } from "@/types";
import { getBatches, addBatch as fbAddBatch, updateBatch as fbUpdateBatch } from "@/lib/firebase/firestore";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddBatchForm } from "@/components/batches/add-batch-form";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import type { BatchFormValues } from "@/lib/schemas";

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const { toast } = useToast();

  const loadBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedBatches = await getBatches();
      setBatches(fetchedBatches);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch batches." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleAddBatch = async (data: BatchFormValues) => {
    try {
      await fbAddBatch(data);
      toast({ title: "Success", description: "Batch added successfully." });
      setIsAddFormOpen(false);
      await loadBatches(); 
    } catch (error) {
      console.error("Failed to add batch:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add batch." });
    }
  };

  const handleUpdateBatch = async (data: BatchFormValues) => {
    if (!editingBatch) return;
    try {
      await fbUpdateBatch(editingBatch.id, data);
      toast({ title: "Success", description: "Batch updated successfully." });
      setIsEditFormOpen(false);
      setEditingBatch(null);
      await loadBatches();
    } catch (error) {
      console.error("Failed to update batch:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update batch." });
    }
  };
  
  const openEditForm = (batch: Batch) => {
    setEditingBatch(batch);
    setIsEditFormOpen(true);
  };

  const columns = useMemo(() => batchColumnsFunction(loadBatches, openEditForm), [loadBatches]);

  if (isLoading && batches.length === 0) {
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Batch Management</h1>
            <p className="text-muted-foreground">Track and manage your vegetable batches.</p>
          </div>
          <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Batch</DialogTitle>
                <DialogDescription>
                  Enter the details for the new batch. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <AddBatchForm 
                onSubmit={handleAddBatch} 
                onClose={() => setIsAddFormOpen(false)} 
                isEditMode={false}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading && batches.length > 0 ? (
           <div className="flex justify-center py-4">
             <Icons.Spinner className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : (
          <DataTable columns={columns} data={batches} searchKey="name" searchPlaceholder="Search by batch name..."/>
        )}


        {isEditFormOpen && editingBatch && (
          <Dialog open={isEditFormOpen} onOpenChange={(isOpen) => {
            setIsEditFormOpen(isOpen);
            if (!isOpen) setEditingBatch(null);
          }}>
            <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Batch</DialogTitle>
                <DialogDescription>
                  Update details for batch: {editingBatch.name}.
                </DialogDescription>
              </DialogHeader>
              <AddBatchForm 
                onSubmit={handleUpdateBatch} 
                initialData={editingBatch}
                onClose={() => { setIsEditFormOpen(false); setEditingBatch(null); }}
                isEditMode={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}

