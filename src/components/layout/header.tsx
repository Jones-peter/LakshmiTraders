
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { Icons } from "@/components/icons";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-card shadow-sm">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <Link href="/dashboard" className="flex items-center gap-2">
            <Icons.Logo />
            <h1 className="text-lg font-semibold text-primary hidden sm:block">Lakshmi Traders</h1>
          </Link>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
