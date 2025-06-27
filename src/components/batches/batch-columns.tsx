
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Batch } from "@/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; 
import { updateBatch, deleteBatch } from "@/lib/firebase/firestore"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React from "react"; 
import { Icons } from "@/components/icons";

interface BatchActionsCellProps {
  row: { original: Batch };
  refreshData?: () => void; 
  onEdit: (batch: Batch) => void;
}


const BatchActionsCell: React.FC<BatchActionsCellProps> = ({ row, refreshData, onEdit }) => {
  const batch = row.original;
  const { toast } = useToast();

  const handleToggleStatus = async () => {
    const newStatus = batch.status === "open" ? "closed" : "open";
    try {
      await updateBatch(batch.id, { status: newStatus });
      toast({ title: "Success", description: `Batch ${batch.name} marked as ${newStatus}.` });
      refreshData?.(); 
    } catch (error) {
      console.error("Failed to update batch status:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update batch status." });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBatch(batch.id);
      toast({ title: "Success", description: `Batch ${batch.name} deleted.` });
      refreshData?.(); 
    } catch (error) {
      console.error("Failed to delete batch:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete batch. It might have associated sales or expenses." });
    }
  };

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/batches/${batch.id}`} className="flex items-center w-full">
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={() => onEdit(batch)} className="flex items-center w-full">
            <Icons.Edit className="mr-2 h-4 w-4" /> Edit Batch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(batch.id)} className="flex items-center w-full">
            Copy Batch ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleStatus} className="flex items-center w-full">
            {batch.status === "open" ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Mark as {batch.status === "open" ? "Closed" : "Open"}
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive flex items-center w-full">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the batch
            "{batch.name}". Associated sales records and expenses linked to this batch will NOT be automatically deleted but may become orphaned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Yes, delete batch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


export const batchColumnsFunction = (refreshData?: () => void, onEdit?: (batch: Batch) => void): ColumnDef<Batch>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Batch Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "vegetableType",
    header: "Type",
  },
  {
    accessorKey: "purchaseDate",
    header: "Purchase Date",
    cell: ({ row }) => {
        const dateValue = row.getValue("purchaseDate");
        try {
            return format(parseISO(dateValue as string), "PPP");
        } catch (e) {
            return "Invalid Date";
        }
    }
  },
  {
    accessorKey: "quantityKg",
    header: "Quantity (KG)",
    cell: ({ row }) => `${Number(row.getValue("quantityKg")).toLocaleString()} kg`,
  },
  {
    accessorKey: "totalPurchaseCost",
    header: "Gross Cost (₹)",
    cell: ({ row }) => `₹${Number(row.getValue("totalPurchaseCost")).toLocaleString()}`,
  },
   {
    accessorKey: "purchaseDiscountAmount",
    header: "Discount (₹)",
    cell: ({ row }) => `₹${Number(row.original.purchaseDiscountAmount || 0).toLocaleString()}`,
  },
  // { // Removed 'Other Exp. (₹)' as it's no longer a direct field
  //   accessorKey: "otherBatchExpenses",
  //   header: "Other Exp. (₹)",
  //   cell: ({ row }) => `₹${Number(row.original.otherBatchExpenses || 0).toLocaleString()}`,
  // },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "open" ? "default" : "secondary"} className="whitespace-nowrap">
          {status === "open" ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: (props) => <BatchActionsCell {...props} refreshData={refreshData} onEdit={onEdit!} />, 
  },
];

export const batchColumns: ColumnDef<Batch>[] = batchColumnsFunction();
