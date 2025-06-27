
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Sale, Customer, Batch } from "@/types";
import { MoreHorizontal, CheckCircle, XCircle, Edit2, IndianRupee, CalendarDays, Trash2, FileText, Edit } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import React from "react";
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
import { deleteSale as fbDeleteSale, updateSalePaymentStatus } from "@/lib/firebase/firestore";


interface SaleActionsCellProps {
  row: { original: Sale };
  onEdit: (sale: Sale) => void;
  onViewInvoice: (sale: Sale) => void;
  refreshData?: () => void;
}

const SaleActionsCell: React.FC<SaleActionsCellProps> = ({ row, onEdit, onViewInvoice, refreshData }) => {
  const sale = row.original;
  const { toast } = useToast();

  const handleDeleteSale = async () => {
    try {
      await fbDeleteSale(sale.id);
      toast({ title: "Success", description: "Sale record deleted." });
      refreshData?.();
    } catch (error) {
      console.error("Failed to delete sale:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete sale record." });
    }
  };

  const handleTogglePaymentStatus = async () => {
    const newStatus = sale.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await updateSalePaymentStatus(sale.id, newStatus);
      toast({ title: "Success", description: `Payment status updated to ${newStatus}.` });
      refreshData?.();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update payment status." });
      console.error(error);
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
          <DropdownMenuItem onClick={() => onViewInvoice(sale)}>
            <FileText className="mr-2 h-4 w-4" /> View Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(sale)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Sale
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTogglePaymentStatus}>
            <Edit2 className="mr-2 h-4 w-4" /> 
            Mark as {sale.paymentStatus === 'paid' ? 'Unpaid' : 'Paid'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
             <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Sale
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Sale Record?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this sale record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteSale}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Yes, delete sale
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


export const saleColumnsFunction = (
  customers: Customer[] = [], 
  batches: Batch[] = [],
  onEdit: (sale: Sale) => void,
  onViewInvoice: (sale: Sale) => void,
  refreshData?: () => void,
): ColumnDef<Sale>[] => {

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : customerId;
  };

  const getBatchName = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    return batch ? batch.name : batchId;
  };

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
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
      accessorKey: "saleDate",
      header: () => <div className="flex items-center gap-1"><CalendarDays className="h-4 w-4"/>Sale Date</div>,
      cell: ({ row }) => {
          const dateValue = row.getValue("saleDate");
          try {
              return format(parseISO(dateValue as string), "PPP");
          } catch (e) {
              return "Invalid Date";
          }
      }
    },
    {
      accessorKey: "customerId",
      header: "Customer",
      cell: ({ row }) => getCustomerName(row.getValue("customerId"))
    },
    {
      accessorKey: "batchId",
      header: "Batch",
      cell: ({ row }) => getBatchName(row.getValue("batchId"))
    },
    {
      accessorKey: "quantityKgSold",
      header: "Qty (KG)",
      cell: ({ row }) => `${Number(row.getValue("quantityKgSold")).toLocaleString()} kg`,
    },
    {
      accessorKey: "pricePerKg",
      header: () => <div className="flex items-center gap-1"><IndianRupee className="h-4 w-4"/>Price/KG</div>,
      cell: ({ row }) => `₹${Number(row.getValue("pricePerKg")).toLocaleString()}`,
    },
     {
      accessorKey: "discountAmount",
      header: () => <div className="flex items-center gap-1"><IndianRupee className="h-4 w-4"/>Discount</div>,
      cell: ({ row }) => `₹${Number(row.original.discountAmount || 0).toLocaleString()}`,
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="flex items-center gap-1"><IndianRupee className="h-4 w-4"/>Total</div>,
      cell: ({ row }) => `₹${Number(row.getValue("totalAmount")).toLocaleString()}`,
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus") as string;
        return (
          <Badge variant={status === "paid" ? "default" : "destructive"}>
            {status === "paid" ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: (props) => <SaleActionsCell {...props} onEdit={onEdit} onViewInvoice={onViewInvoice} refreshData={refreshData} />,
    },
  ];
};
