
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/types";
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
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
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { deleteCustomer } from "@/lib/firebase/firestore";
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

interface CustomerActionsCellProps {
  row: { original: Customer };
  refreshData?: () => void;
}

const CustomerActionsCell: React.FC<CustomerActionsCellProps> = ({ row, refreshData }) => {
  const customer = row.original;
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteCustomer(customer.id);
      toast({ title: "Success", description: `Customer ${customer.name} deleted.` });
      refreshData?.();
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete customer." });
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
            <Link href={`/customers/${customer.id}`}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>
          {/* <DropdownMenuItem onClick={() => console.log("Edit customer:", customer.id)} disabled>
            <Edit className="mr-2 h-4 w-4" /> Edit (Not Impl.)
          </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:bg-destructive/20 focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the customer "{customer.name}".
            Consider implications for associated sales records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Yes, delete customer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const customerColumnsFunction = (refreshData?: () => void): ColumnDef<Customer>[] => [
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
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "contactPhone",
    header: "Phone",
    cell: ({ row }) => row.getValue("contactPhone") || "N/A",
  },
  {
    accessorKey: "contactEmail",
    header: "Email",
    cell: ({ row }) => row.getValue("contactEmail") || "N/A",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
        const address = row.getValue("address") as string;
        return address && address.length > 30 ? `${address.substring(0, 30)}...` : (address || "N/A");
    }
  },
  {
    accessorKey: "createdAt",
    header: "Registered On",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as number; // Assuming it's a number (timestamp)
      try {
        return format(new Date(createdAt), "PPP");
      } catch (e) {
        return "Invalid Date";
      }
    }
  },
  {
    id: "actions",
    cell: (props) => <CustomerActionsCell {...props} refreshData={refreshData} />,
  },
];

export const customerColumns: ColumnDef<Customer>[] = customerColumnsFunction();
