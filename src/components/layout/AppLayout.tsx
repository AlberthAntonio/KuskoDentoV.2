
"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database, LogOut, LayoutDashboard, ShieldCheck, BarChart3, CreditCard, AlertTriangle, QrCode, Building2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isSuperAdmin = user.role === 'superadmin';
  const isClinic = user.role === 'clinic';
  
  // LÓGICA DE ESTADOS DE CUENTA
  const isSuspended = user.subscriptionStatus === 'suspended';
  const isBlocked = user.subscriptionStatus === 'blocked';

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
      icon: CreditCard, 
      label: 'Suscripciones', 
      href: '/admin/subscriptions', 
      show: isSuperAdmin 
    },
    { 
      icon: UserSquare2, 
      label: 'Pacientes', 
      href: '/patients', 
      show: !isSuperAdmin && !isSuspended 
    },
    { 
      icon: Stethoscope, 
      label: 'Tratamientos', 
      href: '/treatments', 
      show: !isSuperAdmin && !isSuspended 
    },
    { 
      icon: Landmark, 
      label: 'Pagos', 
      href: '/payments', 
      show: !isSuperAdmin && !isSuspended 
    },
    { 
      icon: Activity, 
      label: 'Odontograma', 
      href: '/odontogram', 
      show: !isSuperAdmin && !isSuspended 
    },
    { 
      icon: Calendar, 
      label: 'Citas', 
      href: '/appointments', 
      show: !isSuperAdmin && !isSuspended 
    },
    { 
      icon: isSuperAdmin ? ShieldCheck : Users, 
      label: isSuperAdmin ? 'Consultorios' : 'Personal', 
      href: '/admin/users', 
      show: (isSuperAdmin || isClinic) && !isSuspended 
    },
    { 
      icon: Database, 
      label: 'Copia de Seguridad', 
      href: '/backups', 
      show: (isSuperAdmin || isClinic) && !isSuspended 
    },
  ];

  // PANTALLA DE BLOQUEO TOTAL
  if (isBlocked && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Cuenta Bloqueada</h2>
          <p className="text-slate-600">Comuníquese con el administrador para restablecer el acceso a su consultorio.</p>
          <button onClick={logout} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

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
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Estado de Cuenta</p>
              <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'destructive'} className="w-full justify-center py-1">
                {user.subscriptionStatus === 'active' ? 'ACTIVA' : user.subscriptionStatus === 'suspended' ? 'SUSPENDIDA' : 'BLOQUEADA'}
              </Badge>
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
            <div className="flex-1 flex justify-center">
              {isSuspended && !isSuperAdmin && (
                <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-tight">Servicio Suspendido - Regularice su pago</span>
                </div>
              )}
            </div>
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
          <main className="flex-1 overflow-auto p-8 relative">
            {isSuspended && !isSuperAdmin && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-8">
                <div className="max-w-xl w-full bg-white border-2 border-amber-200 rounded-3xl shadow-2xl p-10 text-center space-y-6">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Cuenta suspendida por falta de pago</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Para reactivar el servicio debe realizar el pago vía **Yape** y enviar la captura al WhatsApp del administrador o comunicarse directamente.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="border rounded-2xl p-4 flex flex-col items-center gap-2 bg-slate-50">
                      <QrCode className="w-10 h-10 text-primary" />
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Yape / Plin</p>
                    </div>
                    <div className="border rounded-2xl p-4 flex flex-col items-center gap-2 bg-slate-50">
                      <Building2 className="w-10 h-10 text-primary" />
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Banco / CCI</p>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button onClick={logout} className="px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Salir del Sistema
                    </button>
                    <a href="https://wa.me/51900000000" target="_blank" className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                      Contactar por WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
