
"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database, LogOut, LayoutDashboard, ShieldCheck, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isSuperAdmin = user.role === 'superadmin';
  const isClinic = user.role === 'clinic';

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Panel Principal', 
      href: '/dashboard', 
      show: true 
    },
    { 
      icon: BarChart3, 
      label: 'Reportes', 
      href: '/admin/reports', 
      show: isSuperAdmin 
    },
    { 
      icon: UserSquare2, 
      label: 'Pacientes', 
      href: '/patients', 
      show: !isSuperAdmin 
    },
    { 
      icon: Stethoscope, 
      label: 'Tratamientos', 
      href: '/treatments', 
      show: !isSuperAdmin 
    },
    { 
      icon: Landmark, 
      label: 'Pagos', 
      href: '/payments', 
      show: !isSuperAdmin 
    },
    { 
      icon: Activity, 
      label: 'Odontograma', 
      href: '/odontogram', 
      show: !isSuperAdmin 
    },
    { 
      icon: Calendar, 
      label: 'Citas', 
      href: '/appointments', 
      show: !isSuperAdmin 
    },
    { 
      icon: isSuperAdmin ? ShieldCheck : Users, 
      label: isSuperAdmin ? 'Consultorios' : 'Personal', 
      href: '/admin/users', 
      show: isSuperAdmin || isClinic 
    },
    { 
      icon: Database, 
      label: 'Copia de Seguridad', 
      href: '/backups', 
      show: isSuperAdmin || isClinic 
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="p-6">
            <h1 className="text-2xl font-bold text-primary tracking-tight">KuskoDento</h1>
            <p className="text-xs text-muted-foreground">Gestión Odontológica</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-4">
              {menuItems.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
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
            <div className="mb-4 px-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Rol Actual</p>
              <p className="text-xs font-medium text-primary bg-primary/5 py-1 px-2 rounded">
                {user.role === 'superadmin' ? 'Súper Usuario' : 
                 user.role === 'clinic' ? 'Consultorio' : 
                 user.role === 'doctor' ? 'Doctor(a)' : 'Personal'}
              </p>
            </div>
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
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user.fullName || user.username}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {(user.fullName || user.username).charAt(0).toUpperCase()}
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
