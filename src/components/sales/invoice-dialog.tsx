
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Sale, Customer, Batch } from "@/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image'; 

interface InvoiceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: Sale | null;
  customer: Customer | null;
  batch: Batch | null;
}

export function InvoiceDialog({ isOpen, onOpenChange, sale, customer, batch }: InvoiceDialogProps) {
  if (!sale || !customer || !batch) {
    return null;
  }

  const handlePrint = () => {
    const printableContent = document.getElementById('invoice-content');
    if (printableContent) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write('<html><head><title>Invoice</title>');
      printWindow?.document.write('<style>');
      printWindow?.document.write(`
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .invoice-container { border: 1px solid #eee; padding: 20px; max-width: 800px; margin: auto; }
        .header-print { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .header-print .logo-container-print { display: flex; align-items: center; }
        .header-print .logo-container-print img { max-height: 80px; width: auto; margin-right: 10px; object-fit: contain;}
        .header-print h1 { margin: 0; font-size: 24px; color: #38761D; }
        .company-details-print p, .customer-details-print p, .invoice-details-print p { margin: 2px 0; font-size: 12px; }
        .section-title-print { font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f9f9f9; }
        .totals-print { margin-top: 20px; text-align: right; }
        .totals-print div { margin-bottom: 5px; font-size: 13px; }
        .totals-print div span:first-child { display: inline-block; width: 150px; text-align: right; margin-right: 10px; }
        .totals-print .grand-total-print { font-weight: bold; font-size: 14px; border-top: 1px solid #ccc; padding-top: 5px; }
        .footer-print { text-align: center; font-size: 10px; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
      `);
      printWindow?.document.write('</style></head><body>');
      const clonedContent = printableContent.cloneNode(true) as HTMLElement;
      
      const logoImg = clonedContent.querySelector('.logo-container-print img') as HTMLImageElement | null;
      if (logoImg) {
        logoImg.src = '/logo-invoice.png'; // Ensure this path is correct and image is in public folder
        logoImg.alt = 'Lakshmi Traders Logo';
      }
      
      clonedContent.querySelectorAll('.header').forEach(el => el.classList.replace('header','header-print'));
      clonedContent.querySelectorAll('.logo-container').forEach(el => el.classList.replace('logo-container','logo-container-print'));
      clonedContent.querySelectorAll('.company-details').forEach(el => el.classList.replace('company-details','company-details-print'));
      clonedContent.querySelectorAll('.customer-details').forEach(el => el.classList.replace('customer-details','customer-details-print'));
      clonedContent.querySelectorAll('.invoice-details').forEach(el => el.classList.replace('invoice-details','invoice-details-print'));
      clonedContent.querySelectorAll('.section-title').forEach(el => el.classList.replace('section-title','section-title-print'));
      clonedContent.querySelectorAll('.totals').forEach(el => el.classList.replace('totals','totals-print'));
      clonedContent.querySelectorAll('.grand-total').forEach(el => el.classList.replace('grand-total','grand-total-print'));
      clonedContent.querySelectorAll('.footer').forEach(el => el.classList.replace('footer','footer-print'));

      printWindow?.document.write(clonedContent.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.print();
    }
  };
  
  const subtotal = sale.quantityKgSold * sale.pricePerKg;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl sm:text-2xl">Invoice</DialogTitle>
          <DialogDescription>
            Sale Invoice for transaction ID: {sale.id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto">
          <div id="invoice-content" className="p-6 invoice-container">
            {/* Header */}
            <div className="header flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="logo-container flex items-center">
                <Image 
                  src="/logo-invoice.png" 
                  alt="Lakshmi Traders Logo" 
                  width={180} 
                  height={60} 
                  className="object-contain"
                  data-ai-hint="company logo"
                />
              </div>
              <div className="company-details text-left sm:text-right">
                <p><strong>Lakshmi Traders</strong></p>
                <p>Ambasamuduram - 627 401</p>
                <p>N.Iyppan - 📞 9362692255</p>
                <p>I.Raja - 📞 9080702937</p>
              </div>
            </div>
            <Separator className="my-4"/>

            {/* Invoice and Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="customer-details">
                <h3 className="section-title text-base sm:text-lg font-semibold">Bill To:</h3>
                <p><strong>{customer.name}</strong></p>
                <p>{customer.address || 'N/A'}</p>
                <p>{customer.contactPhone || 'N/A'}</p>
                <p>{customer.contactEmail || 'N/A'}</p>
              </div>
              <div className="invoice-details text-left sm:text-right">
                <h3 className="section-title text-base sm:text-lg font-semibold">Invoice Details:</h3>
                <p><strong>Invoice #:</strong> {sale.id}</p>
                <p><strong>Date:</strong> {format(parseISO(sale.saleDate), "PPP")}</p>
                <p><strong>Batch:</strong> {batch.name} ({batch.vegetableType})</p>
                <p><strong>Payment Status:</strong> <span className={`font-semibold ${sale.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>{sale.paymentStatus.toUpperCase()}</span></p>
              </div>
            </div>

            {/* Items Table */}
            <div className="section-title text-base sm:text-lg font-semibold">Items:</div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity (kg)</th>
                    <th>Rate (₹/kg)</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{batch.vegetableType} (from Batch: {batch.name})</td>
                    <td>{sale.quantityKgSold.toLocaleString()}</td>
                    <td>{sale.pricePerKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="totals mt-4 text-sm sm:text-base sm:text-right">
              <div className="flex justify-between sm:justify-end sm:gap-4"><span>Subtotal:</span> <span>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              {sale.discountAmount && sale.discountAmount > 0 && (
                <div className="flex justify-between sm:justify-end sm:gap-4"><span>Discount:</span> <span>- ₹{sale.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              )}
              <Separator className="my-1"/>
              <div className="grand-total flex justify-between sm:justify-end sm:gap-4 font-bold text-base sm:text-lg"><span>Total Amount:</span> <span>₹{sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="mt-6">
                <div className="section-title text-base sm:text-lg font-semibold">Notes:</div>
                <p className="text-sm text-muted-foreground">{sale.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="footer mt-6 text-center text-xs">
              <p>Thank you for your business!</p>
              <p>All amounts are in Indian Rupees (₹).</p>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-0 border-t flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Close</Button>
          <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
            Download / Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

