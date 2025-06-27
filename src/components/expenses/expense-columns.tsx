
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Expense } from "@/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, CalendarDays, IndianRupee } from "lucide-react";
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
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { deleteExpense } from "@/lib/firebase/firestore";
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

interface ExpenseActionsCellProps {
  row: { original: Expense };
  refreshData?: () => void;
  onEdit: (expense: Expense) => void;
}

const ExpenseActionsCell: React.FC<ExpenseActionsCellProps> = ({ row, refreshData, onEdit }) => {
  const expense = row.original;
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteExpense(expense.id);
      toast({ title: "Success", description: `Expense "${expense.description}" deleted.` });
      refreshData?.();
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete expense." });
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
          <DropdownMenuItem onClick={() => onEdit(expense)} className="flex items-center w-full">
            <Icons.Edit className="mr-2 h-4 w-4" /> Edit Expense
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
            This action cannot be undone. This will permanently delete the expense record for "{expense.description}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Yes, delete expense
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const expenseColumnsFunction = (refreshData?: () => void, onEdit?: (expense: Expense) => void): ColumnDef<Expense>[] => [
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
    accessorKey: "expenseDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent"
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateValue = row.getValue("expenseDate");
      try {
        return format(parseISO(dateValue as string), "PPP");
      } catch (e) {
        return "Invalid Date";
      }
    },
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right flex items-center justify-end gap-1"><IndianRupee className="h-4 w-4"/>Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => row.getValue("category") || "N/A",
  },
  {
    id: "actions",
    cell: (props) => <ExpenseActionsCell {...props} refreshData={refreshData} onEdit={onEdit!} />,
  },
];

export const expenseColumns: ColumnDef<Expense>[] = expenseColumnsFunction();
