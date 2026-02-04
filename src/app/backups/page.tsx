"use client";

import { useState } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Download, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function BackupContent() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
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
      toast({ title: "Respaldo generado", description: "El archivo de copia de seguridad se ha descargado correctamente." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el respaldo." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm("¿Está seguro de restaurar esta base de datos? Se sobrescribirán todos los datos actuales.");
    if (!confirmRestore) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        await db.importData(content);
        toast({ title: "Datos restaurados", description: "La base de datos ha sido actualizada con éxito." });
      };
      reader.readAsText(file);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "El archivo no es válido." });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold text-primary">Copia de Seguridad</h2>
          <p className="text-muted-foreground mt-1">Protege tu información clínica con respaldos locales periódicos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="h-2 bg-emerald-500" />
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                <Download className="w-6 h-6" />
              </div>
              <CardTitle>Exportar Datos</CardTitle>
              <CardDescription>Descarga toda la información del sistema en un solo archivo.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 mb-6 text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Pacientes y Historiales</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Radiografías y Consentimientos</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Odontogramas y Citas</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Usuarios y Pagos</li>
              </ul>
              <Button onClick={handleExport} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={isExporting}>
                {isExporting ? "Generando..." : "Descargar Respaldo"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="h-2 bg-amber-500" />
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <CardTitle>Importar Datos</CardTitle>
              <CardDescription>Restaura una copia de seguridad previa desde tu computadora.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  Atención: Restaurar un respaldo eliminará todos los datos actuales y los reemplazará por los del archivo.
                </p>
              </div>
              <label className="block w-full">
                <Button asChild variant="outline" className="w-full h-12 border-amber-500 text-amber-600 hover:bg-amber-50" disabled={isImporting}>
                  <span>
                    {isImporting ? "Procesando..." : "Seleccionar Archivo"}
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
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
