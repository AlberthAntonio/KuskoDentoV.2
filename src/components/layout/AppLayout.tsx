
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database, LogOut, LayoutDashboard, ShieldCheck, BarChart3, CreditCard, AlertTriangle, QrCode, Building2, ShieldAlert, Banknote, User as UserIcon, X, MessageCircle, Boxes, Wallet, Timer, AlertCircle, Sun, Moon, Laptop, Sparkles } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type PaymentMethod = {
  id: string;
  type: 'qr' | 'bank';
  label: string;
  value: string;
  qrImage?: string;
};

function hexToHsl(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function getReminderIntervalMs(graceDay: number): number {
  if (graceDay <= 1) return 5 * 60 * 60 * 1000;
  if (graceDay === 2) return 3 * 60 * 60 * 1000;
  if (graceDay === 3) return 60 * 60 * 1000;
  if (graceDay === 4) return 30 * 60 * 1000;
  if (graceDay === 5) return 20 * 60 * 1000;
  if (graceDay === 6) return 10 * 60 * 1000;
  return 5 * 60 * 1000;
}

function getReminderIntervalLabel(graceDay: number): string {
  if (graceDay <= 1) return '5 horas';
  if (graceDay === 2) return '3 horas';
  if (graceDay === 3) return '1 hora';
  if (graceDay === 4) return '30 minutos';
  if (graceDay === 5) return '20 minutos';
  if (graceDay === 6) return '10 minutos';
  return '5 minutos';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isMoraReminderOpen, setIsMoraReminderOpen] = useState(false);
  const [moraCountdown, setMoraCountdown] = useState(5);
  const overdueDays = user?.nextPaymentDate
    ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(user.nextPaymentDate)))
    : 0;

  const currentStatus = user ? (() => {
    if (user.subscriptionStatus === 'blocked') return 'blocked';
    if (user.subscriptionStatus === 'suspended') return 'suspended';
    if (!user.nextPaymentDate) return 'active';
    if (overdueDays > 7) return 'blocked';
    if (overdueDays > 0) return 'overdue';
    return 'active';
  })() : 'active';

  const isAdmin = user?.role === 'admin';
  const isClinic = ['clinic', 'clinic_owner', 'clinic_admin'].includes(user?.role || '');
  const isSuspended = currentStatus === 'suspended';
  const isBlocked = currentStatus === 'blocked';
  const isOverdue = currentStatus === 'overdue';
  const graceDay = isOverdue ? Math.min(overdueDays, 7) : 0;
  const reminderIntervalMs = graceDay > 0 ? getReminderIntervalMs(graceDay) : 0;
  const reminderIntervalLabel = graceDay > 0 ? getReminderIntervalLabel(graceDay) : '';

  useEffect(() => {
    if (user) {
      const adminRoutes = ['/admin/reports', '/admin/subscriptions', '/admin/billing'];
      const clinicOnlyRoutes = ['/backups', '/admin/users'];
      
      if (!isAdmin && adminRoutes.some(route => pathname.startsWith(route))) {
         router.push('/dashboard');
      }

      if (user.role !== 'clinic' && !isAdmin && clinicOnlyRoutes.some(route => pathname.startsWith(route))) {
         router.push('/dashboard');
      }
    }
  }, [pathname, user, isAdmin, router]);

  useEffect(() => {
    setPaymentMethods([]);
  }, [user?.id]);

  useEffect(() => {
    if (!isOverdue || isAdmin || !user?.id || reminderIntervalMs <= 0) {
      setIsMoraReminderOpen(false);
      return;
    }

    setIsMoraReminderOpen(true);
    setMoraCountdown(5);

    const interval = setInterval(() => {
      setIsMoraReminderOpen(true);
      setMoraCountdown(5);
    }, reminderIntervalMs);

    return () => clearInterval(interval);
  }, [isOverdue, isAdmin, user?.id, reminderIntervalMs]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMoraReminderOpen && moraCountdown > 0) {
      timer = setInterval(() => {
        setMoraCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMoraReminderOpen, moraCountdown]);

  useEffect(() => {
    const styleId = 'dynamic-brand-color';
    const existing = document.getElementById(styleId);

    if (!user?.primaryColor) {
      existing?.remove();
      return;
    }

    const hslValue = hexToHsl(user.primaryColor);
    const styleElement = existing ?? document.createElement('style');
    styleElement.id = styleId;
    styleElement.innerHTML = `
      :root, .dark {
        --primary: ${hslValue} !important;
        --ring: ${hslValue} !important;
        --sidebar-primary: ${hslValue} !important;
        --sidebar-accent-foreground: ${hslValue} !important;
      }
      [data-sidebar="menu-button"][data-active="true"] {
        background-color: hsla(${hslValue}, 0.1) !important;
        border-left: 3px solid hsl(${hslValue}) !important;
        border-radius: 0 0.5rem 0.5rem 0 !important;
        color: hsl(${hslValue}) !important;
      }
    `;

    if (!existing) {
      document.head.appendChild(styleElement);
    }

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [user?.primaryColor, user?.id, user?.clinicId, user?.clinic_id]);

  useEffect(() => {
    const applyTheme = (theme: string) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };
    if (user?.theme) {
      applyTheme(user.theme);
    } else {
      applyTheme('light');
    }
  }, [user?.theme]);

  if (!user) return null;

  const toggleTheme = () => {
    const newTheme: 'light' | 'dark' = user.theme === 'dark' ? 'light' : 'dark';
    const updatedUser: typeof user = { ...user, theme: newTheme };
    updateUser(updatedUser);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel Principal', href: '/dashboard', show: true },
    { icon: BarChart3, label: 'Reportes', href: '/admin/reports', show: isAdmin },
    { icon: CreditCard, label: 'Suscripciones', href: '/admin/subscriptions', show: isAdmin },
    { icon: Banknote, label: 'Pagos de Red', href: '/admin/billing', show: isAdmin },
    { icon: isAdmin ? ShieldCheck : Users, label: isAdmin ? 'Consultorios' : 'Personal', href: '/admin/users', show: (isAdmin || isClinic) && !isSuspended },
    { icon: UserSquare2, label: 'Pacientes', href: '/patients', show: !isAdmin && !isSuspended },
    { icon: Stethoscope, label: 'Tratamientos', href: '/treatments', show: !isAdmin && !isSuspended },
    { icon: Landmark, label: 'Pagos Pacientes', href: '/payments', show: !isAdmin && !isSuspended },
    { icon: Activity, label: 'Odontograma', href: '/odontogram', show: !isAdmin && !isSuspended },
    { icon: Calendar, label: 'Citas', href: '/appointments', show: !isAdmin && !isSuspended },
    { icon: Boxes, label: 'Inventario', href: '/inventory', show: !isAdmin && !isSuspended },
    { icon: Database, label: 'Copia de Seguridad', href: '/backups', show: (isAdmin || isClinic) && !isSuspended },
    { icon: UserIcon, label: 'Mi Perfil', href: '/profile', show: true },
  ];

  if (isBlocked && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center space-y-6">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Cuenta Bloqueada</h2>
          <p className="text-slate-600 font-medium leading-relaxed">Comuníquese con el administrador central para restablecer el acceso a su consultorio.</p>
          <button onClick={logout} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Sidebar variant="inset" className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none">
          <SidebarHeader className="p-8 pb-4">
            {user.photo ? (
              <div className="h-16 w-full flex items-center justify-start overflow-hidden px-2 mb-2">
                <img src={user.photo} className="max-h-full max-w-full object-contain" alt="Logo de la Clínica" />
              </div>
            ) : (
              <div className="flex items-center gap-4 px-2 mb-4 group">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                   <Sparkles className="w-6 h-6" />
                </div>
                <div>
                   <h1 className="text-xl font-black text-primary tracking-tight leading-none uppercase">{user.brandName || 'KuskoDento'}</h1>
                   <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">{user.slogan || 'Digital Health'}</p>
                </div>
              </div>
            )}
          </SidebarHeader>
          <SidebarContent className="pt-4">
            <SidebarMenu className="px-4 space-y-1">
              {menuItems.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                    className="py-6 px-5 transition-all"
                  >
                    <Link href={item.href} className="flex items-center gap-4">
                      <item.icon className="w-5 h-5 opacity-80" />
                      <span className="font-bold tracking-tight">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <div className="mt-auto p-8 border-t bg-slate-50/50 dark:bg-slate-900/20">
            {!isAdmin && (
              <div className="mb-6 space-y-4">
                <div className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none">Status Acceso</p>
                    <Badge 
                      variant={currentStatus === 'active' ? 'default' : 'destructive'} 
                      className={cn(
                        "text-[9px] h-5 font-black px-2 uppercase tracking-tighter",
                        isOverdue && "bg-amber-500 hover:bg-amber-600",
                        currentStatus === 'active' && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                    >
                      {isBlocked ? 'BLOQUEADO' : isSuspended ? 'SUSPENDIDO' : isOverdue ? 'EN MORA' : 'ACTIVO'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">ABONO:</span>
                      <span className="text-primary">S/. {user.subscriptionFee?.toFixed(2)}</span>
                    </p>
                    {user.nextPaymentDate && (
                      <p className="flex justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground">LÍMITE:</span>
                        <span className={cn(isOverdue ? "text-amber-600" : "text-slate-600 dark:text-slate-400")}>
                          {format(parseISO(user.nextPaymentDate), 'dd/MM/yyyy')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full h-12 text-[10px] font-black gap-3 shadow-xl shadow-primary/20 rounded-2xl uppercase tracking-widest transition-transform active:scale-95" 
                  onClick={() => setIsPayModalOpen(true)}
                >
                  <Wallet className="w-4 h-4" />
                  Pagar / Renovar
                </Button>
              </div>
            )}
            <button 
              onClick={logout}
              className="flex items-center gap-4 text-destructive hover:bg-destructive/10 w-full p-4 rounded-2xl transition-colors font-black text-xs uppercase tracking-widest"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </Sidebar>
        <SidebarInset className="bg-transparent">
          <header className="flex h-20 shrink-0 items-center gap-4 border-b bg-white dark:bg-slate-950 px-8">
            <SidebarTrigger className="h-10 w-10 hover:bg-primary/5 hover:text-primary transition-colors" />
            <div className="flex-1 flex justify-center">
              {isOverdue && !isAdmin && !isSuspended && (
                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-6 py-2 rounded-full flex items-center gap-4 animate-pulse shadow-lg shadow-amber-500/10">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-[11px] font-black uppercase tracking-tight">Día {graceDay} de 7 en gracia. Avisos cada {reminderIntervalLabel}. Realice su pago para evitar bloqueo.</span>
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] font-black underline p-0 hover:bg-transparent ml-4 uppercase tracking-widest" onClick={() => setIsPayModalOpen(true)}>Pagar ahora</Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-12 w-12 hover:bg-primary/5 hover:text-primary">
                {user.theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </Button>
              <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center gap-4 px-2 group cursor-pointer" onClick={() => window.location.href = '/profile'}>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{user.fullName || user.username}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">{isAdmin ? 'Master Admin' : user.role}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white text-lg font-black shadow-lg group-hover:scale-110 transition-transform">
                  {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-10 relative scrollbar-hide">
            {isSuspended && !isAdmin && (
              <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="max-w-4xl w-full bg-white dark:bg-slate-950 border-4 border-amber-200 dark:border-amber-900 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] p-12 space-y-8 overflow-y-auto max-h-full scrollbar-hide">
                  <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <AlertTriangle className="w-12 h-12" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Acceso Restringido</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-bold text-lg">
                      Su servicio ha sido suspendido por falta de pago. Regularice su cuenta para reactivar sus módulos.
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 text-left space-y-8 shadow-inner">
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] border-b pb-4">Medios de Pago Autorizados</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {paymentMethods.map(m => (
                        <div key={m.id} className="bg-white dark:bg-slate-950 p-8 rounded-[2rem] border shadow-xl flex flex-col items-center text-center gap-6 hover:scale-[1.03] transition-transform">
                           <div className="p-5 bg-primary/10 rounded-2xl text-primary">
                             {m.type === 'qr' ? <QrCode className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
                           </div>
                           <div className="min-w-0 w-full space-y-3">
                             <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest leading-none">{m.label}</p>
                             <p className="text-xl font-black text-slate-900 dark:text-white break-all leading-tight">{m.value}</p>
                             {m.qrImage && (
                               <div className="mt-6 p-6 bg-white rounded-3xl inline-block shadow-2xl border-4 border-primary/10">
                                 <img src={m.qrImage} className="w-64 h-64 object-contain mx-auto" alt="QR de Pago" />
                                 <div className="mt-4 py-3 bg-primary text-white rounded-xl">
                                   <p className="text-[11px] font-black uppercase tracking-widest">Escanea para pagar</p>
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8 pt-4">
                    <p className="text-[11px] uppercase font-black text-muted-foreground tracking-[0.3em]">Enviar comprobante vía WhatsApp</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                      <a href="https://wa.me/51929110834" target="_blank" className="flex-1 h-18 py-6 bg-emerald-600 text-white text-xs font-black rounded-3xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-4 uppercase tracking-widest active:scale-95">
                        <MessageCircle className="w-8 h-8" /> Reportar Adm. 1
                      </a>
                      <a href="https://wa.me/51942239654" target="_blank" className="flex-1 h-18 py-6 bg-emerald-600 text-white text-xs font-black rounded-3xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-4 uppercase tracking-widest active:scale-95">
                        <MessageCircle className="w-8 h-8" /> Reportar Adm. 2
                      </a>
                    </div>
                    <button onClick={logout} className="text-xs font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-10 py-4 rounded-2xl transition-all uppercase tracking-[0.2em]">
                      Salir del Sistema
                    </button>
                  </div>
                </div>
              </div>
            )}
            {children}
          </main>
        </SidebarInset>
        <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
          <DialogContent className="sm:max-w-4xl rounded-[3.5rem] border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto scrollbar-hide p-0">
            <div className="bg-primary h-3" />
            <div className="p-14 space-y-10">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-4 text-3xl font-black tracking-tight">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Banknote className="w-8 h-8" /></div>
                  Medios de Pago Autorizados
                </DialogTitle>
                <DialogDescription className="text-lg font-bold text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                  Realice su abono mensual para mantener el servicio activo. Luego de pagar, reporte su comprobante para la validación manual.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {paymentMethods.map(m => (
                  <div key={m.id} className="p-8 rounded-[2.5rem] border-2 bg-slate-50 dark:bg-slate-900 flex flex-col items-center gap-6 transition-all hover:bg-white dark:hover:bg-slate-950 hover:shadow-2xl hover:border-primary/20 group">
                     <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl text-primary border shadow-sm group-hover:scale-110 transition-transform">
                       {m.type === 'qr' ? <QrCode className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
                     </div>
                     <div className="text-center w-full space-y-3">
                        <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest leading-none">{m.label}</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white break-all leading-tight">{m.value}</p>
                        {m.qrImage && (
                          <div className="mt-8 p-6 bg-white rounded-[2rem] inline-block border-2 border-primary/10 shadow-2xl group-hover:border-primary/40 transition-colors">
                            <img src={m.qrImage} className="w-64 h-64 object-contain mx-auto" alt="QR Scan" />
                            <div className="mt-4 py-3 bg-primary text-white rounded-xl">
                               <p className="text-[10px] font-black uppercase tracking-widest">Escanear QR</p>
                            </div>
                          </div>
                        )}
                     </div>
                  </div>
                ))}
              </div>
              <div className="pt-10 border-t space-y-8">
                <p className="text-[11px] font-black text-center text-muted-foreground uppercase tracking-[0.4em]">Reportar Pago vía WhatsApp</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <a href="https://wa.me/51929110834" target="_blank" className="h-20 bg-emerald-600 text-white rounded-3xl font-black text-xs flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest px-8">
                     <MessageCircle className="w-8 h-8" /> Soporte Admin 1
                  </a>
                  <a href="https://wa.me/51942239654" target="_blank" className="h-20 bg-emerald-600 text-white rounded-3xl font-black text-xs flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest px-8">
                     <MessageCircle className="w-8 h-8" /> Soporte Admin 2
                  </a>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog 
          open={isMoraReminderOpen} 
          onOpenChange={(open) => {
            if (!open && moraCountdown > 0) return;
            setIsMoraReminderOpen(open);
          }}
        >
          <DialogContent 
            className="sm:max-w-2xl rounded-[3rem] border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)] p-0 overflow-hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <div className="bg-amber-500 h-3" />
            <div className="p-12 text-center space-y-8">
              <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-12 h-12" />
              </div>
              <div className="space-y-3">
                <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Aviso de Mora</DialogTitle>
                <DialogDescription className="text-lg font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                  Su suscripción está vencida. Se encuentra en el día {graceDay} de 7 de periodo de gracia. Regularice su pago para evitar el bloqueo.
                </DialogDescription>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 p-8 rounded-[2rem] flex items-center justify-between shadow-inner">
                <div className="text-left">
                  <p className="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest">Monto Pendiente</p>
                  <p className="text-4xl font-black text-amber-600 dark:text-amber-500 mt-1">S/. {user.subscriptionFee?.toFixed(2)}</p>
                  <p className="text-[11px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mt-3">Recordatorio cada {reminderIntervalLabel}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-amber-500 font-black text-[10px] px-4 py-1.5 uppercase tracking-tighter">DÍA {graceDay}/7</Badge>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-4 pt-6 border-t items-center">
                <div className="flex-1 flex items-center gap-3 text-muted-foreground">
                  <Timer className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {moraCountdown > 0 ? `Disponible en ${moraCountdown}s` : 'Ya puede continuar'}
                  </span>
                </div>
                <Button onClick={() => {
                  setIsMoraReminderOpen(false);
                  setIsPayModalOpen(true);
                }} className="w-full sm:w-56 h-14 font-black rounded-2xl shadow-xl shadow-primary/10 uppercase tracking-widest transition-transform active:scale-95">
                  Ir a pagar ahora
                </Button>
                <Button onClick={() => setIsMoraReminderOpen(false)} disabled={moraCountdown > 0} className="w-full sm:w-56 h-14 font-black rounded-2xl shadow-xl shadow-amber-500/10 uppercase tracking-widest transition-transform active:scale-95">
                  Entendido
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
