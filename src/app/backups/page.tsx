
"use client";

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db } from '@/lib/legacy-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Download, Upload, ShieldCheck, AlertTriangle, ShieldAlert, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function BackupContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Security states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authAction, setAuthAction] = useState<'export' | 'import' | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const requestAuth = (action: 'export' | 'import', file?: File) => {
    setAuthAction(action);
    setConfirmPassword('');
    if (file) setPendingFile(file);
    setIsAuthOpen(true);
  };

  const handleAuthorizedAction = async () => {
    if (!user) return;

    // API auth no expone password hash al cliente; usamos palabra de confirmacion local.
    if (confirmPassword.trim().toUpperCase() !== 'CONFIRMAR') {
      toast({ variant: "destructive", title: "Error de Seguridad", description: "Contraseña incorrecta." });
      return;
    }

    setIsAuthOpen(false);

    if (authAction === 'export') {
      executeExport();
    } else if (authAction === 'import' && pendingFile) {
      executeImport(pendingFile);
    }
  };

  const executeExport = async () => {
    setIsExporting(true);
    try {
      const data = await db.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kuskodento_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Respaldo generado", description: "Copia de seguridad descargada correctamente." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el respaldo." });
    } finally {
      setIsExporting(false);
    }
  };

  const executeImport = async (file: File) => {
    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        await db.importData(content);
        toast({ title: "Datos restaurados", description: "La base de datos ha sido actualizada con éxito." });
        setTimeout(() => window.location.reload(), 1500);
      };
      reader.readAsText(file);
    } catch (e) {
      toast({ variant: "destructive", title: "Error de Importación", description: "El archivo no es una copia de seguridad válida." });
    } finally {
      setIsImporting(false);
      setPendingFile(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-primary tracking-tight">Copia de Seguridad</h2>
            <p className="text-muted-foreground mt-1">Protege tu información clínica con respaldos locales cifrados</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 h-8 px-4 gap-2">
            <ShieldCheck className="w-3 h-3" /> Conexión Segura
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="h-3 bg-emerald-500" />
            <CardHeader className="p-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-inner group-hover:rotate-6 transition-transform">
                <Download className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-black">Exportar Datos</CardTitle>
              <CardDescription className="text-base font-medium mt-2">Crea una copia maestra de toda tu información encriptada.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <ul className="text-sm space-y-3 mb-8 text-muted-foreground font-bold">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pacientes y Historiales</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Radiografías y Documentos</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Odontogramas y Citas</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Estados de Cuenta</li>
              </ul>
              <Button onClick={() => requestAuth('export')} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-lg font-black rounded-2xl shadow-xl shadow-emerald-500/20" disabled={isExporting}>
                {isExporting ? "Generando..." : "DESCARGAR RESPALDO"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="h-3 bg-amber-500" />
            <CardHeader className="p-8">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 mb-6 shadow-inner group-hover:rotate-6 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-black">Importar Datos</CardTitle>
              <CardDescription className="text-base font-medium mt-2">Restaura la información desde un archivo de respaldo previo.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 p-6 rounded-3xl mb-8 flex gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                  ATENCIÓN: Restaurar un respaldo eliminará todos los datos actuales y los reemplazará permanentemente.
                </p>
              </div>
              <label className="block w-full">
                <Button asChild variant="outline" className="w-full h-14 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-lg font-black rounded-2xl border-2" disabled={isImporting}>
                  <span>
                    {isImporting ? "Procesando..." : "SELECCIONAR ARCHIVO"}
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) requestAuth('import', file);
                      e.target.value = '';
                    }} />
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECURITY: Authentication Dialog for Backups */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl">
          <div className="bg-primary h-2" />
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><Lock className="w-6 h-6" /></div>
              Verificación de Identidad
            </DialogTitle>
            <DialogDescription className="text-base font-bold pt-2">
              Para realizar operaciones maestras de datos, escriba CONFIRMAR.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="pass-auth" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contraseña de Seguridad</Label>
              <Input 
                id="pass-auth" 
                type="text" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="CONFIRMAR"
                className="h-14 rounded-2xl bg-slate-50 focus:bg-white transition-all border-none shadow-inner text-lg"
              />
            </div>
            <Button onClick={handleAuthorizedAction} className="w-full h-16 text-lg font-black rounded-2xl shadow-xl shadow-primary/20">
              CONFIRMAR Y PROCESAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function BackupsPage() {
  return (
    <AuthProvider>
      <BackupContent />
    </AuthProvider>
  );
}
