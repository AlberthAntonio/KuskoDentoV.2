"use client";

import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, UserSquare2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { db, Patient } from '@/lib/db';
import Link from 'next/link';

function OdontogramContent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    db.getAll<Patient>('patients').then(setPatients);
  }, []);

  const filtered = patients.filter(p => 
    p.dni.includes(search) || p.names.toLowerCase().includes(search.toLowerCase()) || p.lastNames.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-primary">Odontograma</h2>
          <p className="text-muted-foreground mt-1">Selecciona un paciente para ver o editar su odontograma gráfico</p>
        </div>

        <Card className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar paciente por DNI o nombre..." 
              className="pl-10 h-11"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <Card key={p.id} className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">
                      {p.names.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{p.lastNames}, {p.names}</h4>
                      <p className="text-xs text-muted-foreground">DNI: {p.dni}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/patients/${p.id}/odontogram`}>Abrir</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function OdontogramPage() {
  return (
    <AuthProvider>
      <OdontogramContent />
    </AuthProvider>
  );
}
