"use client";

import { useState, useEffect, use } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, Odontogram } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Simplified tooth visual component
function Tooth({ id, state, onClick }: { id: number, state: string, onClick: (id: number) => void }) {
  const getColor = () => {
    switch(state) {
      case 'caries': return 'fill-red-500';
      case 'obturado': return 'fill-blue-500';
      case 'ausente': return 'fill-slate-800';
      case 'corona': return 'fill-amber-500';
      default: return 'fill-white hover:fill-slate-100';
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onClick(id)}>
      <span className="text-[10px] font-bold">{id}</span>
      <svg width="40" height="50" viewBox="0 0 40 50" className="border rounded shadow-sm">
        <rect x="5" y="5" width="30" height="40" rx="4" className={`${getColor()} stroke-slate-300 transition-colors`} />
        {state === 'caries' && <circle cx="20" cy="25" r="5" className="fill-white/40" />}
      </svg>
    </div>
  );
}

export default function OdontogramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [toothStates, setToothStates] = useState<Record<number, string>>({});

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const p = await db.getById<Patient>('patients', id);
    if (p) setPatient(p);

    const ods = await db.getAll<Odontogram>('odontograms');
    const existing = ods.find(o => o.patientId === id);
    if (existing) {
      setToothStates(existing.data);
    }
  };

  const handleToothClick = (toothId: number) => {
    const states = ['', 'caries', 'obturado', 'ausente', 'corona'];
    const current = toothStates[toothId] || '';
    const nextIdx = (states.indexOf(current) + 1) % states.length;
    setToothStates({ ...toothStates, [toothId]: states[nextIdx] });
  };

  const handleSave = async () => {
    const od: Odontogram = {
      id: crypto.randomUUID(),
      patientId: id,
      data: toothStates,
      date: new Date().toLocaleDateString('es-PE'),
    };
    await db.put('odontograms', od);
    toast({ title: "Odontograma Guardado", description: "Los cambios han sido registrados en el historial." });
  };

  if (!patient) return null;

  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  return (
    <AuthProvider>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href={`/patients/${id}`}><ChevronLeft /></Link>
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-primary">Odontograma Gráfico</h2>
                <p className="text-muted-foreground">Paciente: {patient.lastNames}, {patient.names}</p>
              </div>
            </div>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-5 h-5" />
              Guardar Cambios
            </Button>
          </div>

          <Card className="border-none shadow-sm overflow-x-auto">
            <CardHeader>
              <CardTitle>Arcada Superior</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center gap-2 py-8 min-w-[800px]">
              {upperTeeth.map(t => (
                <Tooth key={t} id={t} state={toothStates[t] || ''} onClick={handleToothClick} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-x-auto">
            <CardHeader>
              <CardTitle>Arcada Inferior</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center gap-2 py-8 min-w-[800px]">
              {lowerTeeth.map(t => (
                <Tooth key={t} id={t} state={toothStates[t] || ''} onClick={handleToothClick} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm p-6">
             <h4 className="font-bold mb-4">Leyenda</h4>
             <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border"></div> Normal</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500"></div> Caries / Patología</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500"></div> Obturado (Curación)</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-800"></div> Ausente / Extraído</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-500"></div> Corona / Prótesis</div>
             </div>
          </Card>
        </div>
      </AppLayout>
    </AuthProvider>
  );
}
