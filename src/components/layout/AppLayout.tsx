
"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database, LogOut, LayoutDashboard, ShieldCheck, BarChart3, CreditCard, AlertTriangle, QrCode, Building2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAfter, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isSuperAdmin = user.role === 'superadmin';
  const isClinic = user.role === 'clinic';

  // Lógica de suscripción
  const hasSubscription = user.role === 'clinic' && user.nextPaymentDate;
  const nextPayment = hasSubscription ? parseISO(user.nextPaymentDate!) : null;
  const today = new Date();
  
  const isOverdue = nextPayment && isAfter(today, nextPayment);
  const isBlocked = nextPayment && isAfter(today, addDays(nextPayment, 10));

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

  // Pantalla de bloqueo si está bloqueado por mora
  if (isBlocked && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
           <div className="bg-red-600 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold">Sistema Suspendido</h2>
              <p className="mt-2 opacity-90">Tu periodo de gracia de 10 días ha vencido.</p>
           </div>
           <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                 <p className="text-slate-600">Para reactivar tu cuenta y continuar con la gestión odontológica, por favor regulariza tu mensualidad.</p>
                 <Badge variant="outline" className="text-red-600 border-red-600">Vencido el: {user.nextPaymentDate}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="border rounded-2xl p-4 flex flex-col items-center gap-3 bg-slate-50">
                    <QrCode className="w-12 h-12 text-primary" />
                    <div className="text-center">
                       <p className="text-[10px] font-bold uppercase text-muted-foreground">Pagar con QR</p>
                       <p className="text-sm font-bold">Yape / Plin</p>
                    </div>
                 </div>
                 <div className="border rounded-2xl p-4 flex flex-col items-center gap-3 bg-slate-50">
                    <Building2 className="w-12 h-12 text-primary" />
                    <div className="text-center">
                       <p className="text-[10px] font-bold uppercase text-muted-foreground">Transferencia</p>
                       <p className="text-sm font-bold">BCP / BBVA</p>
                    </div>
                 </div>
              </div>

              <div className="bg-muted p-4 rounded-xl space-y-2 text-xs">
                 <p className="flex justify-between"><span>Banco:</span> <b>BCP - Soles</b></p>
                 <p className="flex justify-between"><span>Cuenta:</span> <b>285-12345678-0-12</b></p>
                 <p className="flex justify-between"><span>CCI:</span> <b>002-285-12345678012-12</b></p>
                 <p className="flex justify-between"><span>Titular:</span> <b>KuskoDento Corp.</b></p>
              </div>

              <div className="pt-4 border-t text-center">
                <p className="text-[10px] text-muted-foreground mb-4">Una vez realizado el pago, envía tu comprobante a pagos@kuskodento.com</p>
                <button onClick={logout} className="flex items-center gap-2 text-sm font-bold text-red-600 mx-auto hover:underline">
                  <LogOut className="w-4 h-4" /> Salir del Sistema
                </button>
              </div>
           </div>
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
            <div className="flex-1">
              {isOverdue && !isBlocked && isClinic && (
                 <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-full border border-amber-200 ml-4 max-w-fit animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold">DEUDA PENDIENTE: Tienes hasta 10 días para regularizar tu suscripción.</span>
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
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
