"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Consent, Patient } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, FileText, Plus, User, Calendar, FileCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function ConsentsContent() {
  const [consents, setConsents] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allC = await db.getAll<Consent>('consents');
    const allP = await db.getAll<Patient>('patients');
    
    const combined = allC.map(c => ({
      ...c,
      patientName: allP.find(p => p.id === c.patientId)?.lastNames || 'Paciente'
    }));
    setConsents(combined);
  };

  const filtered = consents.filter(c => 
    c.patientName.toLowerCase().includes(search.toLowerCase()) || 
    c.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Consentimientos Informados</h2>
            <p className="text-muted-foreground mt-1">Archivo digital de documentos legales firmados por pacientes</p>
          </div>
          <Button className="gap-2 h-12">
            <Plus className="w-5 h-5" />
            Nuevo Documento
          </Button>
        </div>

        <Card className="p-6">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por paciente o documento..." 
              className="pl-10 h-11"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => (
              <Card key={c.id} className="border-none shadow-sm hover:border-primary border-2 border-transparent transition-all overflow-hidden">
                <CardContent className="p-0">
                   <div className="p-6 border-b flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl text-primary">
                         <FileText className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold truncate">{c.fileName}</h4>
                         <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><User className="w-3 h-3" /> {c.patientName}</p>
                      </div>
                   </div>
                   <div className="px-6 py-4 flex justify-between items-center bg-muted/30">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.date}</span>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold">VER ARCHIVO</Button>
                   </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                 <FileCheck className="w-12 h-12 mb-4 opacity-20" />
                 <p>No se han archivado documentos de consentimiento aún</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function ConsentsPage() {
  return (
    <AuthProvider>
      <ConsentsContent />
    </AuthProvider>
  );
}
