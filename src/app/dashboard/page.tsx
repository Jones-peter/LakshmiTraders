
import MainLayout from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { DollarSign, Package, Users, AlertCircle, Receipt, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getAllSales, getBatches, getCustomers, getExpenses } from "@/lib/firebase/firestore";
import type { Sale, Batch, Customer, Expense } from "@/types";
import { format, getMonth, getYear, parseISO } from 'date-fns';

interface RevenueData {
  month: string;
  revenue: number; 
}

async function getDashboardStats() {
  const [sales, batches, customers, allExpenses] = await Promise.all([
    getAllSales(),
    getBatches(),
    getCustomers(),
    getExpenses(), // Fetch all expenses
  ]);

  const paidSales = sales.filter(sale => sale.paymentStatus === 'paid');
  const totalRevenue = paidSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  const outstandingPayments = sales
    .filter(sale => sale.paymentStatus === 'unpaid')
    .reduce((sum, sale) => sum + sale.totalAmount, 0);

  const activeBatches = batches.filter(batch => batch.status === 'open').length;
  const totalCustomers = customers.length;

  // Separate standalone expenses (not linked to a batch)
  const standaloneExpenses = allExpenses.filter(exp => !exp.batchId);
  const totalStandaloneExpenses = standaloneExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate Cost of Goods Sold (COGS) more accurately
  let totalCOGS = 0;
  for (const sale of paidSales) {
    const batchForSale = batches.find(b => b.id === sale.batchId);
    if (batchForSale) {
      const netPurchaseCostForBatch = batchForSale.totalPurchaseCost - (batchForSale.purchaseDiscountAmount || 0);
      
      // Sum of expenses specifically linked to this batch
      const expensesForThisBatch = allExpenses.filter(exp => exp.batchId === batchForSale.id);
      const totalDirectExpensesForBatch = expensesForThisBatch.reduce((sum, exp) => sum + exp.amount, 0);
      
      const effectiveCostForBatch = netPurchaseCostForBatch + totalDirectExpensesForBatch;
      
      if (batchForSale.quantityKg > 0) { // Avoid division by zero
        const costPerKgForBatch = effectiveCostForBatch / batchForSale.quantityKg;
        totalCOGS += sale.quantityKgSold * costPerKgForBatch;
      }
    }
  }

  const totalProfitOverall = totalRevenue - (totalCOGS + totalStandaloneExpenses);

  const monthlyRevenueData: { [key: string]: number } = {};
  const now = new Date();
  
  paidSales.forEach(sale => {
      const saleDate = parseISO(sale.saleDate); 
      const year = getYear(saleDate);
      const month = getMonth(saleDate); // 0-indexed

      const monthDiff = (getYear(now) - year) * 12 + (getMonth(now) - month);
      if (monthDiff < 7 && monthDiff >=0) { // consider last 7 months including current
        const monthKey = format(saleDate, "MMM yyyy"); 
        monthlyRevenueData[monthKey] = (monthlyRevenueData[monthKey] || 0) + sale.totalAmount;
      }
    });

  const revenueChartData: RevenueData[] = [];
  for (let i = 6; i >= 0; i--) { // Iterate from 6 months ago to current month
    const dateCursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = format(dateCursor, "MMM yyyy");
    revenueChartData.push({
      month: format(dateCursor, "MMM"), 
      revenue: monthlyRevenueData[monthKey] || 0,
    });
  }
  

  return {
    totalRevenue,
    outstandingPayments,
    activeBatches,
    totalCustomers,
    totalStandaloneExpenses, 
    totalProfitOverall,
    revenueChartData,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatsCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            description="Total revenue from paid sales"
            className="shadow-md hover:shadow-lg transition-shadow"
          />
           <StatsCard
            title="Total Standalone Expenses"
            value={`₹${stats.totalStandaloneExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Receipt}
            description="General operational expenses"
            className="shadow-md hover:shadow-lg transition-shadow"
          />
          <StatsCard
            title="Net Profit"
            value={`₹${stats.totalProfitOverall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            description="Revenue - (COGS + Standalone Exp.)"
            className="shadow-md hover:shadow-lg transition-shadow"
            valueClassName={stats.totalProfitOverall >= 0 ? "text-primary" : "text-destructive"}
          />
          <StatsCard
            title="Outstanding Payments"
            value={`₹${stats.outstandingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={AlertCircle}
            description="Amount yet to be collected"
            className="shadow-md hover:shadow-lg transition-shadow"
            valueClassName={stats.outstandingPayments > 0 ? "text-destructive" : ""}
          />
          <StatsCard
            title="Active Batches"
            value={stats.activeBatches}
            icon={Package}
            description="Currently open batches"
            className="shadow-md hover:shadow-lg transition-shadow"
          />
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            description="Total registered customers"
            className="shadow-md hover:shadow-lg transition-shadow"
          />
        </div>

        <Separator />

        <div>
          <RevenueChart data={stats.revenueChartData} />
        </div>
      </div>
    </MainLayout>
  );
}

export const dynamic = 'force-dynamic';
