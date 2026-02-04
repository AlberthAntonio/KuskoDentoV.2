"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Users, UserSquare2, Stethoscope, Landmark, Image, Activity, FileText, Calendar, Database, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: UserSquare2, label: 'Pacientes', href: '/patients' },
  { icon: Stethoscope, label: 'Tratamientos', href: '/treatments' },
  { icon: Landmark, label: 'Pagos', href: '/payments' },
  { icon: Image, label: 'Radiografías', href: '/radiographs' },
  { icon: Activity, label: 'Odontograma', href: '/odontogram' },
  { icon: FileText, label: 'Consentimientos', href: '/consents' },
  { icon: Calendar, label: 'Citas', href: '/appointments' },
  { icon: Users, label: 'Usuarios', href: '/admin/users' },
  { icon: Database, label: 'Copia de Seguridad', href: '/backups' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="p-6">
            <h1 className="text-2xl font-bold text-primary tracking-tight">KuskoDento</h1>
            <p className="text-xs text-muted-foreground">Clínica Odontológica</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-4">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith(item.href)}
                    className="py-6 px-4"
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <div className="mt-auto p-6 border-t">
            <button 
              onClick={logout}
              className="flex items-center gap-3 text-destructive hover:bg-destructive/10 w-full p-2 rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </Sidebar>
        <SidebarInset className="bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-3 px-2">
              <span className="text-sm font-medium">Dr. {user.username}</span>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
