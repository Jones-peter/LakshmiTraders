
"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { getCustomers, getBatches, getAllSales, getExpenses } from "@/lib/firebase/firestore";
import type { Sale, Customer, Batch, Expense } from "@/types";
import { format, getMonth, getYear, parseISO } from "date-fns";
import { IndianRupee, AlertCircle, Receipt, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


interface UnpaidSaleView extends Sale {
  customerName?: string;
  batchName?: string;
}

interface RevenueData {
  month: string;
  revenue: number;
}

const unpaidSalesColumns: ColumnDef<UnpaidSaleView>[] = [
  { accessorKey: "saleDate", header: "Sale Date", cell: ({ row }) => format(parseISO(row.original.saleDate), "PPP") },
  { accessorKey: "customerName", header: "Customer" },
  { accessorKey: "batchName", header: "Batch" },
  { 
    accessorKey: "totalAmount", 
    header: "Amount Due (₹)", 
    cell: ({ row }) => `₹${row.original.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
  },
];


export default function ReportsPage() {
  const { toast } = useToast();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]); 
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  const [currentMonth, setCurrentMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0')); 
  
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [yearlyRevenue, setYearlyRevenue] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [unpaidSales, setUnpaidSales] = useState<UnpaidSaleView[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<RevenueData[]>([]);

  const [monthlyStandaloneExpenses, setMonthlyStandaloneExpenses] = useState(0);
  const [yearlyStandaloneExpenses, setYearlyStandaloneExpenses] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [yearlyProfit, setYearlyProfit] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesData, customersData, batchesData, expensesData] = await Promise.all([
        getAllSales(), 
        getCustomers(),
        getBatches(),
        getExpenses(), 
      ]);
      setAllSales(salesData || []);
      setAllCustomers(customersData || []);
      setAllBatches(batchesData || []);
      setAllExpenses(expensesData || []);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch report data." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateReport = useCallback(() => {
    if (isLoading || (allSales.length === 0 && allExpenses.length === 0 && allBatches.length === 0)) {
      // Reset all stats if still loading or no data
      setMonthlyRevenue(0); setYearlyRevenue(0); setTotalOutstanding(0);
      setUnpaidSales([]); setRevenueChartData([]);
      setMonthlyStandaloneExpenses(0); setYearlyStandaloneExpenses(0);
      setMonthlyProfit(0); setYearlyProfit(0);
      return;
    }

    const yearNum = parseInt(currentYear);
    const monthNum = parseInt(currentMonth) - 1; 

    const paidSales = allSales.filter(s => s.paymentStatus === 'paid');
    const standaloneExpenses = allExpenses.filter(exp => !exp.batchId); // Expenses not tied to a batch

    // --- Monthly Calculations ---
    const paidSalesInSelectedMonth = paidSales.filter(sale => {
      const saleDate = parseISO(sale.saleDate);
      return getYear(saleDate) === yearNum && getMonth(saleDate) === monthNum;
    });
    const currentMonthlyRev = paidSalesInSelectedMonth.reduce((sum, sale) => sum + sale.totalAmount, 0);
    setMonthlyRevenue(currentMonthlyRev);

    let monthlyCOGS = 0;
    for (const sale of paidSalesInSelectedMonth) {
      const batchForSale = allBatches.find(b => b.id === sale.batchId);
      if (batchForSale) {
        const netPurchaseCostForBatch = batchForSale.totalPurchaseCost - (batchForSale.purchaseDiscountAmount || 0);
        const expensesForThisBatch = allExpenses.filter(exp => exp.batchId === batchForSale.id);
        const totalDirectExpensesForBatch = expensesForThisBatch.reduce((sum, exp) => sum + exp.amount, 0);
        const effectiveCostForBatch = netPurchaseCostForBatch + totalDirectExpensesForBatch;
        
        if (batchForSale.quantityKg > 0) {
          const costPerKgForBatch = effectiveCostForBatch / batchForSale.quantityKg;
          monthlyCOGS += sale.quantityKgSold * costPerKgForBatch;
        }
      }
    }

    const standaloneExpensesInSelectedMonth = standaloneExpenses.filter(exp => {
      const expDate = parseISO(exp.expenseDate);
      return getYear(expDate) === yearNum && getMonth(expDate) === monthNum;
    });
    const currentMonthlyStandaloneExpenses = standaloneExpensesInSelectedMonth.reduce((sum, exp) => sum + exp.amount, 0);
    setMonthlyStandaloneExpenses(currentMonthlyStandaloneExpenses);
    setMonthlyProfit(currentMonthlyRev - (monthlyCOGS + currentMonthlyStandaloneExpenses));

    // --- Yearly Calculations ---
    const paidSalesInSelectedYear = paidSales.filter(sale => {
      const saleDate = parseISO(sale.saleDate);
      return getYear(saleDate) === yearNum;
    });
    const currentYearlyRev = paidSalesInSelectedYear.reduce((sum, sale) => sum + sale.totalAmount, 0);
    setYearlyRevenue(currentYearlyRev);
    
    let yearlyCOGS = 0;
    for (const sale of paidSalesInSelectedYear) {
      const batchForSale = allBatches.find(b => b.id === sale.batchId);
      if (batchForSale) {
        const netPurchaseCostForBatch = batchForSale.totalPurchaseCost - (batchForSale.purchaseDiscountAmount || 0);
        const expensesForThisBatch = allExpenses.filter(exp => exp.batchId === batchForSale.id);
        const totalDirectExpensesForBatch = expensesForThisBatch.reduce((sum, exp) => sum + exp.amount, 0);
        const effectiveCostForBatch = netPurchaseCostForBatch + totalDirectExpensesForBatch;

        if (batchForSale.quantityKg > 0) {
          const costPerKgForBatch = effectiveCostForBatch / batchForSale.quantityKg;
          yearlyCOGS += sale.quantityKgSold * costPerKgForBatch;
        }
      }
    }

    const standaloneExpensesInSelectedYear = standaloneExpenses.filter(exp => {
      const expDate = parseISO(exp.expenseDate);
      return getYear(expDate) === yearNum;
    });
    const currentYearlyStandaloneExpenses = standaloneExpensesInSelectedYear.reduce((sum, exp) => sum + exp.amount, 0);
    setYearlyStandaloneExpenses(currentYearlyStandaloneExpenses);
    setYearlyProfit(currentYearlyRev - (yearlyCOGS + currentYearlyStandaloneExpenses));

    // --- General Stats ---
    const currentTotalOutstanding = allSales
      .filter(sale => sale.paymentStatus === 'unpaid')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    setTotalOutstanding(currentTotalOutstanding);

    const currentUnpaidSales = allSales
      .filter(sale => sale.paymentStatus === 'unpaid')
      .map(sale => ({
        ...sale,
        customerName: allCustomers.find(c => c.id === sale.customerId)?.name || 'N/A',
        batchName: allBatches.find(b => b.id === sale.batchId)?.name || 'N/A',
      }))
      .sort((a,b) => parseISO(b.saleDate).getTime() - parseISO(a.saleDate).getTime());
    setUnpaidSales(currentUnpaidSales);

    const yearlyChartData: RevenueData[] = [];
    for (let m = 0; m < 12; m++) {
      const monthSales = paidSales.filter(sale => { 
        const saleDate = parseISO(sale.saleDate);
        return getYear(saleDate) === yearNum && getMonth(saleDate) === m;
      });
      yearlyChartData.push({
        month: format(new Date(yearNum, m, 1), "MMM"),
        revenue: monthSales.reduce((sum, s) => sum + s.totalAmount, 0),
      });
    }
    setRevenueChartData(yearlyChartData);

  }, [allSales, allCustomers, allBatches, allExpenses, currentYear, currentMonth, isLoading]);
  
  useEffect(() => {
    generateReport();
  }, [generateReport]); 


  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: format(new Date(0, i), "MMMM"),
  }));

  if (isLoading && allSales.length === 0 && allExpenses.length === 0 && allBatches.length === 0) {
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
      <div className="space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            View financial summaries and sales performance.
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 items-center">
              <Select value={currentYear} onValueChange={setCurrentYear}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={currentMonth} onValueChange={setCurrentMonth}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {(isLoading && (allSales.length > 0 || allExpenses.length > 0 || allBatches.length > 0)) && (
           <div className="flex justify-center py-4">
             <Icons.Spinner className="h-8 w-8 animate-spin text-primary" />
           </div>
        )}

        {!isLoading && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatDisplayCard icon={IndianRupee} title={`Revenue (${months.find(m=>m.value===currentMonth)?.label} ${currentYear})`} value={`₹${monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <StatDisplayCard icon={Receipt} title={`Standalone Exp. (${months.find(m=>m.value===currentMonth)?.label} ${currentYear})`} value={`₹${monthlyStandaloneExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <StatDisplayCard icon={TrendingUp} title={`Profit (${months.find(m=>m.value===currentMonth)?.label} ${currentYear})`} value={`₹${monthlyProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} classNameValue={monthlyProfit >= 0 ? "text-primary" : "text-destructive"} />
                <StatDisplayCard icon={AlertCircle} title="Total Outstanding Payments" value={`₹${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} classNameValue={totalOutstanding > 0 ? "text-destructive font-semibold" : ""} />
                
                <StatDisplayCard icon={IndianRupee} title={`Revenue (Year ${currentYear})`} value={`₹${yearlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <StatDisplayCard icon={Receipt} title={`Standalone Exp. (Year ${currentYear})`} value={`₹${yearlyStandaloneExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <StatDisplayCard icon={TrendingUp} title={`Profit (Year ${currentYear})`} value={`₹${yearlyProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} classNameValue={yearlyProfit >= 0 ? "text-primary" : "text-destructive"} />
            </div>
            
            <RevenueChart data={revenueChartData} title={`Monthly Revenue Breakdown for ${currentYear}`} />

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Outstanding Payments Details</CardTitle>
                    <CardDescription>List of all unpaid sales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={unpaidSalesColumns} data={unpaidSales} searchKey="customerName" searchPlaceholder="Search by customer..."/>
                </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}


interface StatDisplayCardProps {
    icon: React.ElementType;
    title: string;
    value: string | number;
    classNameValue?: string;
}
const StatDisplayCard = ({icon: Icon, title, value, classNameValue}: StatDisplayCardProps) => (
    <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", classNameValue)}>{value}</div>
        </CardContent>
    </Card>
);
