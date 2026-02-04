"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Radiograph, Patient } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Image as ImageIcon, ZoomIn, Calendar, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function RadiographsContent() {
  const [radiographs, setRadiographs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

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
          <h2 className="text-3xl font-bold text-primary">Archivo de Radiografías</h2>
          <p className="text-muted-foreground mt-1">Busca y previsualiza imágenes diagnósticas de tus pacientes</p>
        </div>

        <Card className="p-6">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre de paciente o archivo..." 
              className="pl-10 h-11"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.map(r => (
              <Card key={r.id} className="overflow-hidden group border-none shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="aspect-square bg-slate-900 relative flex items-center justify-center overflow-hidden">
                  <ImageIcon className="w-12 h-12 text-slate-700 opacity-50" />
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="p-3 bg-white space-y-1">
                   <p className="text-xs font-bold truncate text-primary uppercase">{r.patientName}</p>
                   <p className="text-[10px] truncate text-muted-foreground">{r.fileName}</p>
                   <div className="flex justify-between items-center pt-1 mt-1 border-t">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Calendar className="w-2 h-2" /> {r.date}</span>
                   </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                 <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                 <p>No se encontraron radiografías registradas</p>
              </div>
            )}
          </div>
        </Card>
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
