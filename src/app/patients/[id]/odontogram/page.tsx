
"use client";

import { useState, useEffect, use } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, Odontogram } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, RotateCcw, Info, Printer, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// FDI quadrants
const quad1 = [18, 17, 16, 15, 14, 13, 12, 11];
const quad2 = [21, 22, 23, 24, 25, 26, 27, 28];
const quad4 = [48, 47, 46, 45, 44, 43, 42, 41];
const quad3 = [31, 32, 33, 34, 35, 36, 37, 38];

// Children quadrants
const quad5 = [55, 54, 53, 52, 51];
const quad6 = [61, 62, 63, 64, 65];
const quad8 = [85, 84, 83, 82, 81];
const quad7 = [71, 72, 73, 74, 75];

interface InteractiveToothProps {
  id: number;
  data: any;
  selectedTool: string;
  tools: any[];
  onSurfaceClick: (toothId: number, surface: string) => void;
  onStateToggle: (toothId: number, state: string) => void;
}

function InteractiveTooth({ 
  id, 
  data, 
  selectedTool,
  tools,
  onSurfaceClick,
  onStateToggle
}: InteractiveToothProps) {
  const surfaces = data?.surfaces || {};
  const globalState = data?.globalState || 'none';

  const getSurfaceColor = (name: string) => {
    const status = surfaces[name] || 'healthy';
    if (status === 'healthy') return 'fill-white stroke-slate-300';
    
    const tool = tools.find(t => t.id === status);
    if (!tool) return 'fill-white stroke-slate-300';
    
    if (tool.color.includes('red')) return 'fill-red-500 stroke-red-700';
    if (tool.color.includes('blue')) return 'fill-blue-500 stroke-blue-700';
    if (tool.color.includes('amber')) return 'fill-amber-400 stroke-amber-600';
    if (tool.color.includes('purple')) return 'fill-purple-400 stroke-purple-600';
    if (tool.color.includes('emerald')) return 'fill-emerald-500 stroke-emerald-700';
    if (tool.color.includes('slate')) return 'fill-slate-800 stroke-slate-900';
    
    return 'fill-slate-400 stroke-slate-600';
  };

  const isGlobalTool = ['missing', 'crown', 'bridge'].includes(selectedTool);

  const handleClick = (surface: string) => {
    if (!isGlobalTool) {
      onSurfaceClick(id, surface);
    } else {
      onStateToggle(id, selectedTool);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 group">
      <span className="text-[9px] font-bold text-muted-foreground">{id}</span>
      <div className="relative w-9 h-9 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-7 h-7 overflow-visible">
          <path d="M 10 10 L 90 10 L 70 30 L 30 30 Z" className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('top'))} onClick={() => handleClick('top')} />
          <path d="M 30 70 L 70 70 L 90 90 L 10 90 Z" className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('bottom'))} onClick={() => handleClick('bottom')} />
          <path d="M 10 10 L 30 30 L 30 70 L 10 90 Z" className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('left'))} onClick={() => handleClick('left')} />
          <path d="M 90 10 L 90 90 L 70 70 L 70 30 Z" className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('right'))} onClick={() => handleClick('right')} />
          <rect x="30" y="30" width="40" height="40" className={cn("transition-colors cursor-pointer hover:opacity-80", getSurfaceColor('center'))} onClick={() => handleClick('center')} />
          
          {globalState === 'missing' && <path d="M 0 0 L 100 100 M 100 0 L 0 100" className="stroke-red-600 stroke-[8px]" />}
          {globalState === 'crown' && <circle cx="50" cy="50" r="45" className="fill-none stroke-amber-500 stroke-[6px]" />}
          {globalState === 'bridge' && <line x1="0" y1="50" x2="100" y2="50" className="stroke-purple-600 stroke-[12px] opacity-60" />}
        </svg>
      </div>
    </div>
  );
}

function OdontogramContent({ id }: { id: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [teethData, setTeethData] = useState<Record<number, any>>({});
  const [selectedTool, setSelectedTool] = useState<string>('caries');
  
  const [customTools, setCustomTools] = useState([
    { id: 'caries', label: 'Caries', color: 'bg-red-500' },
    { id: 'filling', label: 'Obturado', color: 'bg-blue-500' },
    { id: 'healthy', label: 'Sano', color: 'bg-white' },
    { id: 'missing', label: 'Ausente', color: 'bg-slate-800' },
    { id: 'crown', label: 'Corona', color: 'bg-amber-400' },
    { id: 'bridge', label: 'Póntico', color: 'bg-purple-400' },
  ]);

  const [newTool, setNewTool] = useState({ label: '', color: 'bg-emerald-500' });
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const p = await db.getById<Patient>('patients', id);
      if (p) setPatient(p);

      const ods = await db.getAll<Odontogram>('odontograms');
      const patientOdontograms = ods.filter(o => o.patientId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (patientOdontograms.length > 0) {
        setTeethData(patientOdontograms[0].data);
      }
    };
    load();
  }, [id]);

  const handleSurfaceClick = (toothId: number, surface: string) => {
    const currentTooth = teethData[toothId] || { surfaces: {}, globalState: 'none' };
    const currentSurfaceStatus = currentTooth.surfaces[surface] || 'healthy';
    const newStatus = currentSurfaceStatus === selectedTool ? 'healthy' : selectedTool;
    setTeethData({ ...teethData, [toothId]: { ...currentTooth, surfaces: { ...currentTooth.surfaces, [surface]: newStatus } } });
  };

  const handleStateToggle = (toothId: number, state: string) => {
    const currentTooth = teethData[toothId] || { surfaces: {}, globalState: 'none' };
    const newGlobalState = currentTooth.globalState === state ? 'none' : state;
    setTeethData({ ...teethData, [toothId]: { ...currentTooth, globalState: newGlobalState } });
  };

  const handleSave = async () => {
    const od: Odontogram = { id: crypto.randomUUID(), patientId: id, data: teethData, date: new Date().toISOString() };
    await db.put('odontograms', od);
    toast({ title: "Odontograma Guardado", description: "El registro dental se ha actualizado con éxito." });
  };

  const handlePrint = () => {
    window.print();
  };

  const addTool = () => {
    if (!newTool.label) return;
    const toolId = newTool.label.toLowerCase().replace(/\s/g, '_');
    setCustomTools([...customTools, { ...newTool, id: toolId }]);
    setNewTool({ label: '', color: 'bg-emerald-500' });
    setIsToolDialogOpen(false);
  };

  if (!patient) return null;

  return (
    <AppLayout>
      <div className="space-y-6 print:m-0 print:p-0">
        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-primary pb-4 mb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold text-primary">KuskoDento</h1>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Odontograma Profesional</p>
            </div>
            <div className="text-right text-xs">
              <p>Fecha: {new Date().toLocaleDateString('es-PE')}</p>
              <p>Médico: Dr. {user?.username}</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-muted/20 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Paciente</p>
              <p className="text-lg font-bold">{patient.lastNames}, {patient.names}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">DNI / Documento</p>
              <p className="text-lg font-bold">{patient.dni}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon"><Link href={`/patients/${id}`}><ChevronLeft /></Link></Button>
            <div>
              <h2 className="text-3xl font-bold text-primary">Odontograma Integral</h2>
              <p className="text-muted-foreground">Control dental de <span className="font-bold text-foreground">{patient.lastNames}, {patient.names}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" /> Imprimir</Button>
            <Button variant="outline" onClick={() => { if(confirm("¿Limpiar todo el odontograma?")) setTeethData({}); }}><RotateCcw className="w-4 h-4 mr-2" /> Reiniciar</Button>
            <Button onClick={handleSave} className="gap-2"><Save className="w-5 h-5" /> Guardar Estado</Button>
          </div>
        </div>

        <Card className="border-none shadow-md overflow-hidden print:shadow-none print:border">
          <CardHeader className="bg-muted/50 border-b p-4 print:hidden">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-bold text-muted-foreground mr-2">Herramientas:</span>
                {customTools.map(c => (
                  <Button key={c.id} size="sm" variant={selectedTool === c.id ? 'default' : 'outline'} onClick={() => setSelectedTool(c.id)} className="gap-2">
                    <div className={cn("w-3 h-3 rounded-full border", c.color)} /> {c.label}
                  </Button>
                ))}
                <Dialog open={isToolDialogOpen} onOpenChange={setIsToolDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 border-dashed border-2"><Plus className="w-3 h-3" /> Nueva</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Agregar Herramienta de Diagnóstico</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nombre del Hallazgo</Label>
                        <Input value={newTool.label} onChange={e => setNewTool({...newTool, label: e.target.value})} placeholder="Ej: Endodoncia" />
                      </div>
                      <div className="space-y-2">
                        <Label>Color Distintivo</Label>
                        <div className="flex gap-2 flex-wrap">
                          {['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-400', 'bg-purple-400', 'bg-slate-800', 'bg-pink-500'].map(col => (
                            <div 
                              key={col} 
                              onClick={() => setNewTool({...newTool, color: col})}
                              className={cn("w-8 h-8 rounded-full cursor-pointer border-2", col, newTool.color === col ? 'border-primary ring-2 ring-primary/20' : 'border-transparent')} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={addTool} className="w-full">Agregar a la Paleta</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-10">
            <div className="space-y-12">
              {/* Upper Arch */}
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Arcada Superior (Permanente & Decidua)</h4>
                  <div className="flex justify-center items-center gap-1 overflow-x-auto pb-4 w-full scrollbar-hide">
                    <div className="flex gap-1 md:gap-2">
                      {quad1.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                    <div className="w-0.5 h-10 bg-primary/20 mx-2 md:mx-4" />
                    <div className="flex gap-1 md:gap-2">
                      {quad2.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                  </div>
                  <div className="flex justify-center items-center gap-1 overflow-x-auto pb-4 w-full scrollbar-hide mt-4">
                    <div className="flex gap-2 md:gap-4">
                      {quad5.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                    <div className="w-0.5 h-8 bg-primary/10 mx-6 md:mx-10" />
                    <div className="flex gap-2 md:gap-4">
                      {quad6.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full border-t border-dashed border-slate-300 print:border-slate-400" />

              {/* Lower Arch */}
              <div className="space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex justify-center items-center gap-1 overflow-x-auto pb-4 w-full scrollbar-hide mb-4">
                    <div className="flex gap-2 md:gap-4">
                      {quad8.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                    <div className="w-0.5 h-8 bg-primary/10 mx-6 md:mx-10" />
                    <div className="flex gap-2 md:gap-4">
                      {quad7.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                  </div>
                  <div className="flex justify-center items-center gap-1 overflow-x-auto pb-4 w-full scrollbar-hide">
                    <div className="flex gap-1 md:gap-2">
                      {quad4.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                    <div className="w-0.5 h-10 bg-primary/20 mx-2 md:mx-4" />
                    <div className="flex gap-1 md:gap-2">
                      {quad3.map(t => <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />)}
                    </div>
                  </div>
                  <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">Arcada Inferior (Permanente & Decidua)</h4>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:mt-10">
          <Card className="p-4 border-none shadow-sm bg-primary/5 print:bg-white print:border">
            <h5 className="font-bold flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> Convenciones del Odontograma</h5>
            <div className="text-[10px] space-y-1 text-muted-foreground print:text-foreground">
              <p>Gráfico FDI profesional con 5 superficies por pieza:</p>
              <div className="grid grid-cols-2 gap-x-4">
                <p>• <b>Superior:</b> Vestibular</p>
                <p>• <b>Inferior:</b> Palatino/Lingual</p>
                <p>• <b>Laterales:</b> Mesial/Distal</p>
                <p>• <b>Centro:</b> Oclusal/Incisal</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm bg-accent/5 print:bg-white print:border">
            <h5 className="font-bold mb-2">Resumen de Hallazgos Clínicos</h5>
            <div className="flex flex-wrap gap-2">
              {customTools.map(tool => {
                let count = 0;
                Object.values(teethData).forEach((t: any) => {
                  if (t.globalState === tool.id) count++;
                  if (t.surfaces) {
                    Object.values(t.surfaces).forEach(s => { if(s === tool.id) count++; });
                  }
                });
                if (count === 0) return null;
                return (
                  <Badge key={tool.id} variant="secondary" className="gap-2 print:border">
                    <div className={cn("w-2 h-2 rounded-full", tool.color)} />
                    {tool.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Print Signatures */}
        <div className="hidden print:block mt-20">
          <div className="flex justify-between items-center px-10">
            <div className="text-center border-t border-slate-400 pt-2 w-48">
              <p className="text-xs font-bold uppercase">Firma del Doctor</p>
            </div>
            <div className="text-center border-t border-slate-400 pt-2 w-48">
              <p className="text-xs font-bold uppercase">Firma del Paciente</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function OdontogramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthProvider>
      <OdontogramContent id={id} />
    </AuthProvider>
  );
}
