
import type { ReactNode } from 'react';
import { AppSidebarContent } from '@/components/app-sidebar-content';
import { UserNav } from '@/components/user-nav';
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { Logo } from '@/components/logo';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar className="border-r bg-sidebar text-sidebar-foreground">
        <AppSidebarContent />
      </Sidebar>
      <div className="min-h-screen flex flex-1 flex-col"> {/* Changed order of flex classes */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
          <SidebarTrigger className="sm:hidden" />
           <div className="flex items-center gap-2 sm:hidden">
             <Logo />
             <Link href="/dashboard">
              <h1 className="font-semibold text-lg text-primary">{APP_NAME}</h1>
             </Link>
           </div>
          {/* Placeholder for breadcrumbs or page title */}
          <div className="ml-auto flex items-center gap-4">
            <UserNav />
          </div>
        </header>
        <SidebarInset>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/40">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
