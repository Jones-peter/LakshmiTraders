
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { SidebarNav } from "./sidebar-nav";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from 'next/link';
import { AppFooter } from './footer'; // Import the footer

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.Spinner className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Icons.Logo />
            <span className="text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">Lakshmi Traders</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2">
           <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center">
             <LogOut className="h-4 w-4" />
             <span className="group-data-[collapsible=icon]:hidden">Logout</span>
           </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen"> {/* Ensure full height for footer placement */}
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
        <AppFooter /> {/* Add footer here */}
      </SidebarInset>
    </SidebarProvider>
  );
}
