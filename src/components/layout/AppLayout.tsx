
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database, LogOut, LayoutDashboard, ShieldCheck, BarChart3, CreditCard, AlertTriangle, QrCode, Building2, ShieldAlert, Banknote, User as UserIcon, X, CheckCircle2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isAfter, parseISO, addDays } from 'date-fns';
import { db, PaymentMethod } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  useEffect(() => {
    if (user && user.role === 'clinic') {
      db.getAll<PaymentMethod>('payment_methods').then(setPaymentMethods);
    }
  }, [user]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isClinic = user.role === 'clinic';
  
  const getCalculatedStatus = () => {
    if (user.subscriptionStatus === 'blocked') return 'blocked';
    if (!user.nextPaymentDate) return 'active';
    const next = parseISO(user.nextPaymentDate);
    const today = new Date();
    if (isAfter(today, addDays(next, 10))) return 'suspended';
    if (isAfter(today, next)) return 'overdue';
    return 'active';
  };

  const currentStatus = getCalculatedStatus();
  const isSuspended = currentStatus === 'suspended';
  const isBlocked = currentStatus === 'blocked';
  const isOverdue = currentStatus === 'overdue';

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
    { icon: Database, label: 'Copia de Seguridad', href: '/backups', show: (isAdmin || isClinic) && !isSuspended },
    { icon: UserIcon, label: 'Mi Perfil', href: '/profile', show: true },
  ];

  if (isBlocked && !isAdmin) {
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
            {!isAdmin && (
              <div className="mb-4 px-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Estado de Cuenta</p>
                <Badge 
                  variant={currentStatus === 'active' ? 'default' : 'destructive'} 
                  className={cn(
                    "w-full justify-center py-1",
                    isOverdue && "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  {isBlocked ? 'BLOQUEADA' : isSuspended ? 'SUSPENDIDA' : isOverdue ? 'MORA' : 'ACTIVA'}
                </Badge>
                {user.nextPaymentDate && (
                  <p className="text-[9px] text-center mt-2 text-muted-foreground font-bold">
                    Vence: {format(parseISO(user.nextPaymentDate), 'dd/MM/yyyy')}
                  </p>
                )}
                {(isOverdue || isSuspended) && (
                  <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-[10px] font-bold border-primary text-primary hover:bg-primary/5" onClick={() => setIsPayModalOpen(true)}>
                    PAGAR AQUÍ
                  </Button>
                )}
              </div>
            )}
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
              {isOverdue && !isAdmin && !isSuspended && (
                <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-1.5 rounded-full flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-tight">Periodo de gracia activo. Regularice su pago.</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] font-black underline p-0 hover:bg-transparent ml-2" onClick={() => setIsPayModalOpen(true)}>PAGAR AQUÍ</Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user.fullName || user.username}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{isAdmin ? 'Administrador' : user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {(user.fullName || user.username).charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-8 relative">
            {isSuspended && !isAdmin && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[4px] z-[100] flex items-center justify-center p-8 text-center">
                <div className="max-w-4xl w-full bg-white border-2 border-amber-200 rounded-3xl shadow-2xl p-10 space-y-6 overflow-y-auto max-h-full scrollbar-hide">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 uppercase">Servicio Suspendido</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Su acceso ha sido restringido por falta de pago. Realice el depósito y envíe el comprobante a cualquiera de nuestros administradores para reactivar sus módulos.
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-left space-y-6">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Información para Pagos</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {paymentMethods.map(m => (
                        <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center gap-4 shadow-sm hover:shadow-md transition-all">
                           <div className="p-3 bg-primary/5 rounded-xl text-primary">
                             {m.type === 'qr' ? <QrCode className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                           </div>
                           <div className="min-w-0 w-full space-y-2">
                             <p className="text-[10px] font-black uppercase text-muted-foreground leading-none tracking-widest">{m.label}</p>
                             <p className="text-lg font-black text-slate-900 break-all">{m.value}</p>
                             {m.qrImage && (
                               <div className="mt-4 p-4 bg-white border-2 border-primary/20 rounded-2xl inline-block shadow-lg">
                                 <img src={m.qrImage} className="w-64 h-64 object-contain mx-auto" alt="QR de Pago" />
                                 <div className="mt-3 py-2 bg-primary text-white rounded-lg">
                                   <p className="text-[10px] font-bold uppercase tracking-widest">Escanea con Yape o Plin</p>
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>
                      ))}
                      {paymentMethods.length === 0 && <p className="col-span-full text-xs text-center text-muted-foreground italic py-8">Consulte los medios de pago con el administrador.</p>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">Reportar Pago vía WhatsApp (Captura de pantalla)</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <a href="https://wa.me/51929110834" target="_blank" className="flex-1 h-16 bg-emerald-600 text-white text-sm font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 uppercase">
                        <MessageCircle className="w-6 h-6" /> Reportar a Adm. 1 (+51929110834)
                      </a>
                      <a href="https://wa.me/51942239654" target="_blank" className="flex-1 h-16 bg-emerald-600 text-white text-sm font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 uppercase">
                        <MessageCircle className="w-6 h-6" /> Reportar a Adm. 2 (+51942239654)
                      </a>
                    </div>
                    <button onClick={logout} className="text-sm font-bold text-red-600 hover:bg-red-50 px-8 py-3 rounded-xl transition-colors">
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
            {children}
          </main>
        </SidebarInset>

        {/* Modal Pagar Aquí */}
        <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
          <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                <Banknote className="w-6 h-6 text-emerald-600" /> Medios de Pago Autorizados
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Realice el abono y envíe la captura de pantalla a uno de nuestros números de soporte técnico.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              {paymentMethods.map(m => (
                <div key={m.id} className="p-6 rounded-2xl border bg-slate-50 flex flex-col items-center gap-4 transition-all hover:bg-white hover:shadow-lg group">
                   <div className="p-4 bg-white rounded-xl text-primary border border-slate-100 group-hover:scale-105 transition-transform">
                     {m.type === 'qr' ? <QrCode className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
                   </div>
                   <div className="text-center w-full space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">{m.label}</p>
                      <p className="text-xl font-black text-slate-800 break-all">{m.value}</p>
                      {m.qrImage && (
                        <div className="mt-4 p-4 bg-white rounded-2xl inline-block border-2 border-primary/20 shadow-xl group-hover:border-primary transition-colors">
                          <img src={m.qrImage} className="w-60 h-60 object-contain mx-auto" alt="QR Scan" />
                          <div className="mt-3 py-2 bg-primary/10 text-primary rounded-lg">
                            <p className="text-[9px] font-black uppercase tracking-widest">Escanea para pagar</p>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                   <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p className="text-sm font-bold uppercase tracking-widest">No hay medios de pago registrados.</p>
                </div>
              )}
            </div>
            <div className="pt-8 border-t space-y-6">
              <p className="text-[10px] font-black text-center text-muted-foreground uppercase tracking-[0.3em]">Enviar comprobante (Captura) a:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="https://wa.me/51929110834" target="_blank" className="h-16 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 uppercase px-4">
                   <MessageCircle className="w-6 h-6" /> WhatsApp Adm. 1 (+51929110834)
                </a>
                <a href="https://wa.me/51942239654" target="_blank" className="h-16 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 uppercase px-4">
                   <MessageCircle className="w-6 h-6" /> WhatsApp Adm. 2 (+51942239654)
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
