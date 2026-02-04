
"use client";

import { useState, useEffect, use } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, Odontogram } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, RotateCcw, Info, Check } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// FDI quadrants
const quad1 = [18, 17, 16, 15, 14, 13, 12, 11];
const quad2 = [21, 22, 23, 24, 25, 26, 27, 28];
const quad4 = [48, 47, 46, 45, 44, 43, 42, 41];
const quad3 = [31, 32, 33, 34, 35, 36, 37, 38];

const CONDITIONS = [
  { id: 'healthy', label: 'Sano', color: 'bg-white' },
  { id: 'caries', label: 'Caries', color: 'bg-red-500' },
  { id: 'filling', label: 'Obturado', color: 'bg-blue-500' },
];

const GLOBAL_STATES = [
  { id: 'missing', label: 'Ausente', color: 'bg-slate-800' },
  { id: 'crown', label: 'Corona', color: 'bg-amber-400' },
  { id: 'bridge', label: 'Póntico', color: 'bg-purple-400' },
];

// Individual tooth component with 5 surfaces
function InteractiveTooth({ 
  id, 
  data, 
  selectedTool,
  onSurfaceClick,
  onStateToggle
}: { 
  id: number; 
  data: any; 
  selectedTool: string;
  onSurfaceClick: (toothId: number, surface: string) => void;
  onStateToggle: (toothId: number, state: string) => void;
}) {
  const surfaces = data?.surfaces || {};
  const globalState = data?.globalState || 'none';

  const getSurfaceColor = (name: string) => {
    const status = surfaces[name] || 'healthy';
    if (status === 'caries') return 'fill-red-500 stroke-red-700';
    if (status === 'filling') return 'fill-blue-500 stroke-blue-700';
    return 'fill-white stroke-slate-300';
  };

  const isToolCondition = CONDITIONS.some(c => c.id === selectedTool);

  const handleClick = (surface: string) => {
    if (isToolCondition) {
      onSurfaceClick(id, surface);
    } else {
      onStateToggle(id, selectedTool);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 group">
      <span className="text-[10px] font-bold text-muted-foreground">{id}</span>
      <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Odontogram Graphical Tooth (5 surfaces) */}
        <svg viewBox="0 0 100 100" className="w-10 h-10 overflow-visible">
          {/* Top (Vestibular) */}
          <path 
            d="M 10 10 L 90 10 L 70 30 L 30 30 Z" 
            className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('top'))}
            onClick={() => handleClick('top')}
          />
          {/* Bottom (Lingual/Palatal) */}
          <path 
            d="M 30 70 L 70 70 L 90 90 L 10 90 Z" 
            className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('bottom'))}
            onClick={() => handleClick('bottom')}
          />
          {/* Left (Mesial/Distal) */}
          <path 
            d="M 10 10 L 30 30 L 30 70 L 10 90 Z" 
            className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('left'))}
            onClick={() => handleClick('left')}
          />
          {/* Right (Distal/Mesial) */}
          <path 
            d="M 90 10 L 90 90 L 70 70 L 70 30 Z" 
            className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('right'))}
            onClick={() => handleClick('right')}
          />
          {/* Center (Oclusal) */}
          <rect 
            x="30" y="30" width="40" height="40" 
            className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('center'))}
            onClick={() => handleClick('center')}
          />

          {/* Overlays for global states */}
          {globalState === 'missing' && (
            <path d="M 0 0 L 100 100 M 100 0 L 0 100" className="stroke-red-600 stroke-[5px]" />
          )}
          {globalState === 'crown' && (
            <circle cx="50" cy="50" r="45" className="fill-none stroke-amber-500 stroke-[4px]" />
          )}
          {globalState === 'bridge' && (
            <line x1="0" y1="50" x2="100" y2="50" className="stroke-purple-600 stroke-[8px] opacity-60" />
          )}
        </svg>
      </div>
    </div>
  );
}

export default function OdontogramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [teethData, setTeethData] = useState<Record<number, any>>({});
  const [selectedTool, setSelectedTool] = useState<string>('caries');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const p = await db.getById<Patient>('patients', id);
    if (p) setPatient(p);

    const ods = await db.getAll<Odontogram>('odontograms');
    const patientOdontograms = ods.filter(o => o.patientId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (patientOdontograms.length > 0) {
      setTeethData(patientOdontograms[0].data);
    }
  };

  const handleSurfaceClick = (toothId: number, surface: string) => {
    const currentTooth = teethData[toothId] || { surfaces: {}, globalState: 'none' };
    const currentSurfaceStatus = currentTooth.surfaces[surface] || 'healthy';
    
    const newStatus = currentSurfaceStatus === selectedTool ? 'healthy' : selectedTool;
    
    setTeethData({
      ...teethData,
      [toothId]: {
        ...currentTooth,
        surfaces: { ...currentTooth.surfaces, [surface]: newStatus }
      }
    });
  };

  const handleStateToggle = (toothId: number, state: string) => {
    const currentTooth = teethData[toothId] || { surfaces: {}, globalState: 'none' };
    const newGlobalState = currentTooth.globalState === state ? 'none' : state;

    setTeethData({
      ...teethData,
      [toothId]: { ...currentTooth, globalState: newGlobalState }
    });
  };

  const handleSave = async () => {
    const od: Odontogram = {
      id: crypto.randomUUID(),
      patientId: id,
      data: teethData,
      date: new Date().toISOString(),
    };
    await db.put('odontograms', od);
    toast({ title: "Odontograma Guardado", description: "El registro dental se ha actualizado." });
  };

  if (!patient) return null;

  return (
    <AuthProvider>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon"><Link href={`/patients/${id}`}><ChevronLeft /></Link></Button>
              <div>
                <h2 className="text-3xl font-bold text-primary">Odontograma Profesional</h2>
                <p className="text-muted-foreground">Paciente: <span className="font-bold text-foreground">{patient.lastNames}, {patient.names}</span></p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { if(confirm("¿Limpiar?")) setTeethData({}); }}><RotateCcw className="w-4 h-4 mr-2" /> Reiniciar</Button>
              <Button onClick={handleSave} className="gap-2"><Save className="w-5 h-5" /> Guardar Estado</Button>
            </div>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader className="bg-muted/50 border-b p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-sm font-bold text-muted-foreground mr-2">Herramientas:</span>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map(c => (
                    <Button 
                      key={c.id} 
                      size="sm" 
                      variant={selectedTool === c.id ? 'default' : 'outline'}
                      onClick={() => setSelectedTool(c.id)}
                      className="gap-2"
                    >
                      <div className={cn("w-3 h-3 rounded-full border", c.color)} />
                      {c.label}
                    </Button>
                  ))}
                  <div className="w-[1px] h-6 bg-slate-300 mx-2" />
                  {GLOBAL_STATES.map(s => (
                    <Button 
                      key={s.id} 
                      size="sm" 
                      variant={selectedTool === s.id ? 'default' : 'outline'}
                      onClick={() => setSelectedTool(s.id)}
                      className="gap-2"
                    >
                      <div className={cn("w-3 h-3 rounded-full border", s.color)} />
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-12">
                {/* Upper Arc */}
                <div className="flex flex-col items-center gap-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Arcada Superior</h4>
                  <div className="flex justify-center items-center gap-1 overflow-x-auto pb-4 w-full">
                    <div className="flex gap-1 md:gap-3">
                      {quad1.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                    <div className="w-0.5 h-16 bg-primary/20 mx-4" />
                    <div className="flex gap-1 md:gap-3">
                      {quad2.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                  </div>
                </div>

                {/* Lower Arc */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex justify-center items-center gap-1 overflow-x-auto pb-4 w-full">
                    <div className="flex gap-1 md:gap-3">
                      {quad4.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                    <div className="w-0.5 h-16 bg-primary/20 mx-4" />
                    <div className="flex gap-1 md:gap-3">
                      {quad3.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Arcada Inferior</h4>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4 border-none shadow-sm">
              <h5 className="font-bold flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> Guía de superficies</h5>
              <div className="text-xs space-y-2 text-muted-foreground">
                <p>El gráfico representa las 5 superficies del diente:</p>
                <ul className="list-disc pl-4 grid grid-cols-2">
                  <li>Superior: Vestibular/Labial</li>
                  <li>Inferior: Palatino/Lingual</li>
                  <li>Lateral Int.: Mesial</li>
                  <li>Lateral Ext.: Distal</li>
                  <li>Centro: Oclusal/Incisal</li>
                </ul>
              </div>
            </Card>
            <Card className="p-4 border-none shadow-sm bg-primary/5">
              <h5 className="font-bold mb-2">Resumen Clínico</h5>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.concat(GLOBAL_STATES).map(tool => {
                  let count = 0;
                  Object.values(teethData).forEach((t: any) => {
                    if (t.globalState === tool.id) count++;
                    Object.values(t.surfaces || {}).forEach(s => { if(s === tool.id) count++; });
                  });
                  if (count === 0) return null;
                  return (
                    <Badge key={tool.id} variant="secondary" className="gap-2">
                      <div className={cn("w-2 h-2 rounded-full", tool.color)} />
                      {tool.label}: {count}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </AppLayout>
    </AuthProvider>
  );
}
