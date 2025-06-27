
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Sale, Customer, Batch, Expense } from "@/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, Package, CalendarDays, Scale, Banknote, Receipt, TrendingUp, ShoppingBag, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchReportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  batch: Batch | null;
  sales: Sale[];
  batchExpenses: Expense[];
  customers: Customer[];
}

const StatItemDialog: React.FC<{ label: string; value: string | number; icon?: React.ElementType; className?: string; valueClassName?: string }> = ({ label, value, icon: Icon, className, valueClassName }) => (
  <div className={cn("p-3 bg-muted/30 rounded-lg dialog-stat-item", className)}>
    <div className="flex items-center gap-2 mb-1">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
    <p className={cn("text-lg font-semibold", valueClassName)}>{value}</p>
  </div>
);


export function BatchReportDialog({ isOpen, onOpenChange, batch, sales, batchExpenses, customers }: BatchReportDialogProps) {
  if (!batch) {
    return null;
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'N/A';
  };

  const handlePrint = () => {
    const printableContent = document.getElementById('batch-report-content');
    if (printableContent) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write('<html><head><title>Batch Report - Lakshmi Traders</title>');
      printWindow?.document.write('<style>');
      printWindow?.document.write(`
        @media print {
          @page { 
            size: A4; 
            margin: 10mm;
          }
        }
        * { 
          box-sizing: border-box; 
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body { font-family: Arial, sans-serif; margin: 0; color: #333333; font-size: 9pt; line-height: 1.3; }
        .report-container-print { padding: 0; width: 100%; background-color: #ffffff; }
        
        .header-print { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8mm; padding-bottom: 5mm; border-bottom: 1px solid #eeeeee; }
        .header-print .logo-container-print img { max-height: 40px; width: auto; object-fit: contain; }
        .header-print .report-title-print { text-align: right; }
        .header-print .report-title-print h1 { margin: 0; font-size: 16pt; color: #38761D; font-weight: bold; }
        .header-print .report-title-print p { margin: 2px 0 0; font-size: 8pt; color: #6c757d; }
        
        .summary-section-print { 
          display: flex; 
          justify-content: space-between; 
          gap: 8mm; 
          margin-bottom: 8mm; 
        }
        .left-column-print, .right-column-print { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          gap: 1mm; /* Gap between stat items within a column */
        }

        .section-title-print { 
          font-size: 12pt; 
          font-weight: bold; 
          margin-bottom: 3mm; /* Space after title before items */
          padding-bottom: 2mm; 
          border-bottom: 1px solid #cccccc; 
          color: #38761D; 
        }
        
        .stat-item-print { /* Parent div for each "Label: Value" line, goes into columns */
          /* No specific style needed here, acts as a container */
        }
        .stat-item-line-print { /* The <p> tag for a single line of stat */
          font-size: 9pt;
          line-height: 1.3;
          margin: 0 0 1mm 0; 
          padding: 0;
        }
        .stat-item-label-part-print { /* "Label :" part */
          color: #555555; 
        }
        .stat-item-value-part-print { /* "Value" part */
          font-weight: 600; 
          color: #212529; 
          margin-left: 0.5em; 
        }
        /* Style overrides for value part based on transferred classes */
        .stat-item-value-part-print.font-bold { font-weight: bold !important; } 
        .stat-item-value-part-print.profit-loss-print { color: #16A34A !important; font-weight: bold !important; }
        .stat-item-value-part-print.loss-print { color: #DC2626 !important; font-weight: bold !important; }
        .stat-item-value-part-print.text-destructive-print { color: #DC2626 !important; font-weight: bold !important; }
        .stat-item-value-part-print.text-primary-print { color: #38761D !important; font-weight: bold !important;}
        
        .table-wrapper-print { overflow-x: auto; margin-top: 5mm; }
        .table-print { width: 100%; border-collapse: collapse; margin-bottom: 8mm; font-size: 8pt; }
        .table-print th, .table-print td { border: 1px solid #dddddd; padding: 2mm; text-align: left; vertical-align: top; }
        .table-print th { background-color: #f9f9f9; font-weight: bold; }
        .table-print td.number-cell, .table-print th.number-cell { text-align: right; }

        .details-section-print { margin-bottom: 8mm; } 
        .details-section-print .section-title-print { margin-bottom: 3mm; }

        .separator-print { border: none; border-top: 1px solid #eeeeee; margin: 8mm 0; }
        
        .footer-print { text-align: center; font-size: 7pt; color: #777777; margin-top: 10mm; border-top: 1px solid #eeeeee; padding-top: 5mm; }
      `);
      printWindow?.document.write('</style></head><body>');
      
      const clonedContent = printableContent.cloneNode(true) as HTMLElement;

      const logoImg = clonedContent.querySelector('.logo-container-dialog img') as HTMLImageElement | null;
      if (logoImg) {
        logoImg.src = '/logo.png'; 
        logoImg.alt = 'Lakshmi Traders Logo';
        logoImg.style.maxHeight = '40px'; 
      }
      
      clonedContent.classList.replace('report-container-dialog','report-container-print');
      clonedContent.querySelectorAll('.header-dialog').forEach(el => el.classList.replace('header-dialog','header-print'));
      clonedContent.querySelectorAll('.logo-container-dialog').forEach(el => el.classList.replace('logo-container-dialog','logo-container-print'));
      clonedContent.querySelectorAll('.report-title-dialog').forEach(el => el.classList.replace('report-title-dialog','report-title-print'));
      
      // Transform stat items from dialog structure to print structure
      clonedContent.querySelectorAll('.dialog-stat-item').forEach(statItemDialogElement => {
        const labelElement = statItemDialogElement.querySelector('p.text-sm.text-muted-foreground');
        const valueElement = statItemDialogElement.querySelector('p.text-lg.font-semibold');

        if (labelElement && valueElement) {
            const newStatItemContainer = document.createElement('div');
            newStatItemContainer.classList.add('stat-item-print');

            const pLine = document.createElement('p');
            pLine.classList.add('stat-item-line-print');

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('stat-item-label-part-print');
            labelSpan.textContent = (labelElement.textContent?.trim() || '') + " :";

            const valueSpan = document.createElement('span');
            valueSpan.classList.add('stat-item-value-part-print');
            valueSpan.textContent = valueElement.textContent?.trim() || '';
            
            const originalValueClasses = Array.from(valueElement.classList);
            if (originalValueClasses.includes('text-green-600') || originalValueClasses.includes('profit-loss-dialog')) {
                valueSpan.classList.add('profit-loss-print');
            } else if (originalValueClasses.includes('text-red-600') || originalValueClasses.includes('loss-dialog')) {
                valueSpan.classList.add('loss-print');
            } else if (originalValueClasses.includes('text-destructive')) {
                 valueSpan.classList.add('text-destructive-print');
            } else if (originalValueClasses.includes('text-primary')) {
                 valueSpan.classList.add('text-primary-print');
            }
            if (originalValueClasses.includes('font-bold')) {
                valueSpan.classList.add('font-bold');
            }

            pLine.appendChild(labelSpan);
            pLine.appendChild(valueSpan);
            newStatItemContainer.appendChild(pLine);
            
            statItemDialogElement.parentNode?.replaceChild(newStatItemContainer, statItemDialogElement);
        }
      });
      
      clonedContent.querySelectorAll('.section-dialog').forEach(el => el.classList.replace('section-dialog','details-section-print'));
      clonedContent.querySelectorAll('.section-title-dialog').forEach(el => el.classList.replace('section-title-dialog','section-title-print'));
      clonedContent.querySelectorAll('.grid-dialog').forEach(el => el.classList.replace('grid-dialog','grid-print-transformed')); 

      const headerPrintNode = clonedContent.querySelector('.header-print');
      const batchSummarySectionNode = clonedContent.querySelector('[data-print-section="batch-summary"]');
      const salesProfitSectionNode = clonedContent.querySelector('[data-print-section="sales-profitability"]');
      
      const summaryOuterContainer = document.createElement('div');
      summaryOuterContainer.className = 'summary-section-print';
      
      const leftColumn = document.createElement('div');
      leftColumn.className = 'left-column-print';
      
      const rightColumn = document.createElement('div');
      rightColumn.className = 'right-column-print';

      if (batchSummarySectionNode) {
        const title = batchSummarySectionNode.querySelector('.section-title-print');
        if (title) leftColumn.appendChild(title.cloneNode(true));
        // After transformation, stat items are now .stat-item-print
        const stats = batchSummarySectionNode.querySelectorAll('.stat-item-print');
        stats.forEach(stat => leftColumn.appendChild(stat.cloneNode(true)));
        batchSummarySectionNode.remove();
      }

      if (salesProfitSectionNode) {
        const title = salesProfitSectionNode.querySelector('.section-title-print');
        if (title) rightColumn.appendChild(title.cloneNode(true));
        const stats = salesProfitSectionNode.querySelectorAll('.stat-item-print');
        stats.forEach(stat => rightColumn.appendChild(stat.cloneNode(true)));
        salesProfitSectionNode.remove();
      }
      
      summaryOuterContainer.appendChild(leftColumn);
      summaryOuterContainer.appendChild(rightColumn);
      
      if (headerPrintNode && headerPrintNode.parentNode) {
        headerPrintNode.parentNode.insertBefore(summaryOuterContainer, headerPrintNode.nextSibling);
      } else {
        clonedContent.insertBefore(summaryOuterContainer, clonedContent.firstChild);
      }

      clonedContent.querySelectorAll('hr, [role="separator"]').forEach(el => {
          const separator = el as HTMLElement;
          if (!summaryOuterContainer.contains(separator)) {
            const printSeparator = document.createElement('div');
            printSeparator.className = 'separator-print';
            separator.parentNode?.replaceChild(printSeparator, separator);
          } else {
             separator.remove(); 
          }
      });
      
      clonedContent.querySelectorAll('.details-section-print .table-dialog').forEach(el => { 
          el.classList.replace('table-dialog','table-wrapper-print'); 
          const tableEl = el.querySelector('table');
          if(tableEl) tableEl.classList.add('table-print');
      });
      
      clonedContent.querySelectorAll('.footer-dialog').forEach(el => el.classList.replace('footer-dialog','footer-print'));

      printWindow?.document.write(clonedContent.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus(); 
      // Delay print slightly to ensure all styles are applied in the new window
      setTimeout(() => {
        printWindow?.print();
      }, 250);
    }
  };

  const netPurchaseCost = batch.totalPurchaseCost - (batch.purchaseDiscountAmount || 0);
  const totalBatchLinkedExpenses = batchExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalEffectiveBatchCost = netPurchaseCost + totalBatchLinkedExpenses;

  const totalQuantitySold = sales.reduce((sum, sale) => sum + sale.quantityKgSold, 0);
  const totalRevenueFromAllSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalRevenueFromPaidSales = sales.filter(s => s.paymentStatus === 'paid').reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  const batchProfitOrLoss = totalRevenueFromAllSales - totalEffectiveBatchCost;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl sm:text-2xl">Batch Report</DialogTitle>
          <DialogDescription>
            Comprehensive report for batch: {batch.name} (ID: {batch.id})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto">
          <div id="batch-report-content" className="p-6 report-container-dialog">
            {/* Header */}
            <div className="header-dialog flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b">
              <div className="logo-container-dialog">
                <Image 
                  src="/logo-invoice.png" 
                  alt="Lakshmi Traders Logo" 
                  width={180}
                  height={60}
                  className="object-contain"
                  data-ai-hint="company logo"
                />
              </div>
              <div className="report-title-dialog text-left sm:text-right">
                <h1 className="text-2xl font-bold text-primary">Batch Report</h1>
                <p className="text-sm text-muted-foreground">Generated: {format(new Date(), "PPP p")}</p>
              </div>
            </div>

            {/* Batch Summary */}
            <div className="section-dialog mb-6" data-print-section="batch-summary">
              <h3 className="section-title-dialog text-lg font-semibold mb-3 text-primary">Batch Summary</h3>
              <div className="grid-dialog grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatItemDialog label="Batch Name" value={batch.name} icon={Package} />
                <StatItemDialog label="Vegetable Type" value={batch.vegetableType} icon={Package} />
                <StatItemDialog label="Purchase Date" value={format(parseISO(batch.purchaseDate), "PPP")} icon={CalendarDays} />
                <StatItemDialog label="Initial Quantity" value={`${batch.quantityKg.toLocaleString()} kg`} icon={Scale} />
                <StatItemDialog label="Purchase Price/kg" value={`₹${batch.purchasePricePerKg.toLocaleString()}`} icon={IndianRupee} />
                <StatItemDialog label="Gross Purchase Cost" value={`₹${batch.totalPurchaseCost.toLocaleString()}`} icon={IndianRupee} />
                <StatItemDialog label="Purchase Discount" value={`₹${(batch.purchaseDiscountAmount || 0).toLocaleString()}`} icon={IndianRupee} />
                <StatItemDialog label="Net Purchase Cost" value={`₹${netPurchaseCost.toLocaleString()}`} icon={IndianRupee} valueClassName="font-bold text-primary" />
                <StatItemDialog label="Total Batch Expenses" value={`₹${totalBatchLinkedExpenses.toLocaleString()}`} icon={Receipt} />
                <StatItemDialog label="Total Effective Batch Cost" value={`₹${totalEffectiveBatchCost.toLocaleString()}`} icon={Banknote} valueClassName="font-bold text-destructive" />
              </div>
            </div>
            
            <Separator className="my-6"/>

            {/* Sales & Profitability Summary */}
             <div className="section-dialog mb-6" data-print-section="sales-profitability">
                <h3 className="section-title-dialog text-lg font-semibold mb-3 text-primary">Sales &amp; Profitability</h3>
                <div className="grid-dialog grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <StatItemDialog label="Total Quantity Sold" value={`${totalQuantitySold.toLocaleString()} kg`} icon={ShoppingBag} />
                    <StatItemDialog label="Total Revenue (All Sales)" value={`₹${totalRevenueFromAllSales.toLocaleString()}`} icon={IndianRupee} />
                     <StatItemDialog label="Revenue (Paid Sales Only)" value={`₹${totalRevenueFromPaidSales.toLocaleString()}`} icon={IndianRupee} />
                    <StatItemDialog 
                        label="Batch Profit / Loss" 
                        value={`₹${batchProfitOrLoss.toLocaleString()}`} 
                        icon={TrendingUp}
                        valueClassName={cn("font-bold", batchProfitOrLoss >= 0 ? "text-green-600 profit-loss-dialog" : "text-red-600 loss-dialog")}
                    />
                    <StatItemDialog label="Number of Sales" value={sales.length} icon={Users} />
                    <StatItemDialog label="Remaining Quantity" value={`${(batch.quantityKg - totalQuantitySold).toLocaleString()} kg`} icon={Scale}/>
                </div>
            </div>

            <Separator className="my-6"/>

            {/* Detailed Sales */}
            <div className="section-dialog mb-6">
              <h3 className="section-title-dialog text-lg font-semibold mb-2 text-primary">Detailed Sales</h3>
              {sales.length > 0 ? (
                <div className="overflow-x-auto table-dialog">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sale Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="number-cell">Qty (kg)</TableHead>
                        <TableHead className="number-cell">Price/kg (₹)</TableHead>
                        <TableHead className="number-cell">Discount (₹)</TableHead>
                        <TableHead className="number-cell">Total (₹)</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell>{format(parseISO(sale.saleDate), "PP")}</TableCell>
                          <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                          <TableCell className="number-cell">{sale.quantityKgSold.toLocaleString()}</TableCell>
                          <TableCell className="number-cell">{sale.pricePerKg.toLocaleString()}</TableCell>
                           <TableCell className="number-cell">{(sale.discountAmount || 0).toLocaleString()}</TableCell>
                          <TableCell className="number-cell">{sale.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>{sale.paymentStatus}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-muted-foreground">No sales recorded for this batch yet.</p>}
            </div>
            
            <Separator className="my-6"/>

            {/* Detailed Batch Expenses */}
            <div className="section-dialog mb-6">
              <h3 className="section-title-dialog text-lg font-semibold mb-2 text-primary">Detailed Batch Expenses</h3>
              {batchExpenses.length > 0 ? (
                <div className="overflow-x-auto table-dialog">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="number-cell">Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchExpenses.map(expense => (
                        <TableRow key={expense.id}>
                          <TableCell>{format(parseISO(expense.expenseDate), "PP")}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.category || 'N/A'}</TableCell>
                          <TableCell className="number-cell">{expense.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-muted-foreground">No specific expenses recorded for this batch.</p>}
            </div>

            {/* Footer */}
            <div className="footer-dialog mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
              <p>Lakshmi Traders - Batch Performance Report</p>
              <p>All amounts are in Indian Rupees (₹).</p>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-0 border-t flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Close</Button>
          <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
            Download / Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

