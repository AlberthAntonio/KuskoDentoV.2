
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User, PaymentMethod } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, ShieldCheck, AlertCircle, User as UserIcon, QrCode, Building2, Plus, Trash2, Camera, Wallet, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ProfileContent() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isChanging, setIsChanging] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({
    type: 'bank',
    label: '',
    value: '',
    qrImage: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadMethods();
    }
  }, [user]);

  const loadMethods = async () => {
    const all = await db.getAll<PaymentMethod>('payment_methods');
    setPaymentMethods(all);
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    if (passwords.current !== user.password) {
      toast({ variant: 'destructive', title: 'Error', description: 'La contraseña actual es incorrecta.' });
      return;
    }

    setIsChanging(true);
    try {
      const updatedUser: User = { ...user, password: passwords.new };
      await db.put('users', updatedUser);
      
      toast({ 
        title: 'Éxito', 
        description: 'Contraseña actualizada correctamente. Por seguridad, su sesión se cerrará en breve.' 
      });
      
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la contraseña.' });
    } finally {
      setIsChanging(false);
    }
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    const method: PaymentMethod = {
      id: crypto.randomUUID(),
      type: newMethod.type as 'qr' | 'bank',
      label: newMethod.label || '',
      value: newMethod.value || '',
      qrImage: newMethod.qrImage
    };
    await db.put('payment_methods', method);
    setIsMethodOpen(false);
    setNewMethod({ type: 'bank', label: '', value: '', qrImage: '' });
    toast({ title: "Medio de pago agregado al sistema" });
    loadMethods();
  };

  const deleteMethod = async (id: string) => {
    if (confirm("¿Eliminar este medio de pago? Los consultorios ya no podrán verlo.")) {
      await db.delete('payment_methods', id);
      loadMethods();
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewMethod(prev => ({ ...prev, qrImage: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Configuración de Perfil</h2>
            <p className="text-muted-foreground mt-2">Gestiona tu seguridad y datos del sistema</p>
          </div>
          {isAdmin && (
            <Badge className="bg-primary/10 text-primary border-primary/20 h-8 px-4 text-xs font-bold uppercase tracking-widest">
              Administrador Autorizado
            </Badge>
          )}
        </div>

        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl h-auto">
            <TabsTrigger value="security" className="py-2.5 px-6 gap-2"><Lock className="w-4 h-4" /> Seguridad</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="billing" className="py-2.5 px-6 gap-2"><Wallet className="w-4 h-4" /> Medios de Pago del Sistema</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="security">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm h-fit">
                <div className="h-2 bg-primary" />
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" /> Cambiar Contraseña
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleChangePassword}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-pass">Contraseña Actual</Label>
                      <Input 
                        id="current-pass" 
                        type="password" 
                        value={passwords.current} 
                        onChange={e => setPasswords({...passwords, current: e.target.value})} 
                        required 
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pass">Nueva Contraseña</Label>
                      <Input 
                        id="new-pass" 
                        type="password" 
                        value={passwords.new} 
                        onChange={e => setPasswords({...passwords, new: e.target.value})} 
                        required 
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pass">Confirmar Nueva Contraseña</Label>
                      <Input 
                        id="confirm-pass" 
                        type="password" 
                        value={passwords.confirm} 
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                        required 
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-800 font-medium">
                        Su sesión se cerrará automáticamente al actualizar la clave por motivos de seguridad.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-6 px-6">
                    <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl" disabled={isChanging}>
                      {isChanging ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                     <UserIcon className="w-5 h-5 text-primary" /> Información de Cuenta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Nombre:</span>
                      <span className="text-sm font-black text-slate-800">{user.fullName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Usuario:</span>
                      <span className="text-sm font-black text-primary">{user.username}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase">ID Único:</span>
                      <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border">{user.id}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="billing">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Gestión Global de Medios de Pago</CardTitle>
                    <CardDescription>Configura los datos que verán los consultorios para realizar sus pagos mensuales.</CardDescription>
                  </div>
                  <Button onClick={() => setIsMethodOpen(true)} className="gap-2 h-11 px-6 shadow-lg shadow-primary/20">
                    <Plus className="w-5 h-5" /> Agregar Medio
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {paymentMethods.map(m => (
                      <Card key={m.id} className="border-none shadow-sm bg-slate-50 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-4 bg-white rounded-2xl text-primary border border-slate-200 shadow-sm">
                              {m.type === 'qr' ? <QrCode className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm uppercase text-slate-400 tracking-widest">{m.label}</p>
                              <p className="text-lg font-black text-slate-900 break-all">{m.value}</p>
                              {m.qrImage && (
                                <div className="mt-4 p-2 bg-white border-2 border-primary/20 rounded-2xl inline-block shadow-md">
                                  <img src={m.qrImage} className="w-48 h-48 object-contain" alt="QR" />
                                  <div className="mt-2 text-center">
                                    <Badge variant="outline" className="text-[9px] h-5">Previsualización QR</Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteMethod(m.id)} 
                            className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    {paymentMethods.length === 0 && (
                      <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-slate-50/50">
                        <Wallet className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="font-bold text-lg">No hay medios de pago configurados</p>
                        <p className="text-sm">Agregue cuentas bancarias o códigos QR para que los consultorios puedan pagar su suscripción.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialog Nuevo Medio de Pago */}
      <Dialog open={isMethodOpen} onOpenChange={setIsMethodOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="text-primary w-6 h-6" /> Nuevo Medio de Pago
            </DialogTitle>
            <DialogDescription>Estos datos se publicarán inmediatamente en el sistema para que los consultorios los vean.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMethod} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Tipo de Medio</Label>
              <Select value={newMethod.type} onValueChange={v => setNewMethod({...newMethod, type: v as any})}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Cuenta Bancaria (Transferencia)</SelectItem>
                  <SelectItem value="qr">Yape / Plin (Código QR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Entidad o Nombre</Label>
              <Input placeholder="Ej: BCP Soles, BBVA, Yape Administración" value={newMethod.label} onChange={e => setNewMethod({...newMethod, label: e.target.value})} required className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">{newMethod.type === 'qr' ? 'Número de Celular' : 'Número de Cuenta / CCI'}</Label>
              <Input placeholder="Ej: 999 888 777 o 215-00000000" value={newMethod.value} onChange={e => setNewMethod({...newMethod, value: e.target.value})} required className="h-11 rounded-xl" />
            </div>
            {newMethod.type === 'qr' && (
              <div className="space-y-2 bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-primary/20">
                <Label className="font-bold flex items-center gap-2 text-primary">
                  <Camera className="w-4 h-4" /> Imagen del Código QR (Alta Resolución)
                </Label>
                <div className="flex flex-col items-center gap-4 mt-4">
                  <div className="w-56 h-56 border-4 border-white rounded-2xl flex items-center justify-center bg-white shadow-xl overflow-hidden group relative">
                    {newMethod.qrImage ? (
                      <>
                        <img src={newMethod.qrImage} className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="text-white w-8 h-8" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="w-12 h-12 opacity-10 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Sin imagen</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <Input type="file" accept="image/*" onChange={handleQrUpload} className="cursor-pointer h-11 bg-white rounded-xl" />
                    <p className="text-[9px] text-muted-foreground mt-2 text-center uppercase font-bold tracking-widest">
                      Se recomienda subir el QR descargado directamente de la App bancaria
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95">
                Guardar y Publicar Medios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfileContent />
    </AuthProvider>
  );
}
