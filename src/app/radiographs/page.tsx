
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Radiograph, Patient } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Image as ImageIcon, ZoomIn, Calendar, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function RadiographsContent() {
  const [radiographs, setRadiographs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allR = await db.getAll<Radiograph>('radiographs');
    const allP = await db.getAll<Patient>('patients');
    
    const combined = allR.map(r => ({
      ...r,
      patientName: allP.find(p => p.id === r.patientId)?.lastNames || 'Paciente'
    }));
    setRadiographs(combined);
  };

  const filtered = radiographs.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) || 
    r.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-primary">Archivo Maestro de Radiografías</h2>
          <p className="text-muted-foreground mt-1">Gestión centralizada de imágenes diagnósticas digitales</p>
        </div>

        <Card className="p-6">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Escribe el nombre del paciente o archivo..." 
              className="pl-10 h-11"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.map(r => (
              <Card key={r.id} className="overflow-hidden group border-none shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setZoomedImage(URL.createObjectURL(r.fileBlob))}>
                <div className="aspect-square bg-slate-900 relative flex items-center justify-center overflow-hidden">
                   <img 
                      src={URL.createObjectURL(r.fileBlob)} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110" 
                      alt={r.fileName}
                      onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                   />
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="p-3 bg-white space-y-1 border-t">
                   <p className="text-xs font-bold truncate text-primary uppercase">{r.patientName}</p>
                   <p className="text-[10px] truncate text-muted-foreground italic">{r.fileName}</p>
                   <div className="flex justify-between items-center pt-2 mt-1 border-t">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {r.date}</span>
                   </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-24 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-2xl">
                 <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                 <p className="text-lg font-medium">No se han encontrado registros</p>
                 <p className="text-sm opacity-60">Sube radiografías desde el perfil de cada paciente</p>
              </div>
            )}
          </div>
        </Card>

        <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
           <DialogContent className="max-w-[95vw] h-[95vh] flex items-center justify-center p-0 bg-black/95 border-none">
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white z-50 bg-white/10 hover:bg-white/20" onClick={() => setZoomedImage(null)}>
                <X className="w-8 h-8" />
              </Button>
              {zoomedImage && (
                <img src={zoomedImage} className="max-w-full max-h-full object-contain shadow-2xl" alt="Zoom" />
              )}
           </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function RadiographsPage() {
  return (
    <AuthProvider>
      <RadiographsContent />
    </AuthProvider>
  );
}
