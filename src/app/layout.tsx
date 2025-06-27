
import type { Metadata } from 'next';
// import { GeistSans } from 'geist/font/sans'; // Removed due to missing package
// import { GeistMono } from 'geist/font/mono'; // Removed due to missing package
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Lakshmi Traders',
  description: 'Vegetable Wholesale Business Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased font-sans`}> {/* Removed Geist font variables */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
