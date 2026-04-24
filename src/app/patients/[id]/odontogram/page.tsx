"use client";

import { useState, useEffect, use } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, Odontogram } from '@/lib/legacy-data';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Save, RotateCcw, Info, Printer, Plus, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// --- CONFIGURACIÓN DE CUADRANTES ---
const quad1 = [18, 17, 16, 15, 14, 13, 12, 11];
const quad2 = [21, 22, 23, 24, 25, 26, 27, 28];
const quad4 = [48, 47, 46, 45, 44, 43, 42, 41];
const quad3 = [31, 32, 33, 34, 35, 36, 37, 38];

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

// --- COMPONENTE DE DIENTE MORFOLÓGICO ---
function InteractiveTooth({ id, data, selectedTool, tools, onSurfaceClick, onStateToggle }: InteractiveToothProps) {
  const surfaces = data?.surfaces || {};
  const globalState = data?.globalState || 'none';

  const isMolar = [18, 17, 16, 26, 27, 28, 38, 37, 36, 48, 47, 46, 55, 54, 64, 65, 74, 75, 84, 85].includes(id);
  const isPremolar = [15, 14, 24, 25, 34, 35, 44, 45].includes(id);
  const isAnterior = !isMolar && !isPremolar;
  const isUpper = (id >= 11 && id <= 28) || (id >= 51 && id <= 65);

  const getSurfaceColor = (name: string) => {
    const status = surfaces[name] || 'healthy';
    if (status === 'healthy') return { fill: '#FFFFFF', stroke: '#334155' };
    const tool = tools.find(t => t.id === status);
    if (!tool) return { fill: '#FFFFFF', stroke: '#334155' };

    const colorMap: Record<string, { fill: string; stroke: string }> = {
      'bg-red-500':     { fill: '#EF4444', stroke: '#B91C1C' },
      'bg-blue-500':    { fill: '#3B82F6', stroke: '#1D4ED8' },
      'bg-slate-800':   { fill: '#1E293B', stroke: '#0F172A' },
      'bg-amber-400':   { fill: '#FBBF24', stroke: '#D97706' },
      'bg-purple-400':  { fill: '#C084FC', stroke: '#9333EA' },
      'bg-emerald-500': { fill: '#10B981', stroke: '#047857' },
      'bg-pink-500':    { fill: '#EC4899', stroke: '#BE185D' },
      'bg-orange-500':  { fill: '#F97316', stroke: '#C2410C' },
    };
    return colorMap[tool.color] || { fill: '#94A3B8', stroke: '#475569' };
  };

  const handleClick = (surface: string) => {
    if (!['missing', 'crown', 'bridge'].includes(selectedTool)) {
      onSurfaceClick(id, surface);
    } else {
      onStateToggle(id, selectedTool);
    }
  };

  const rootColor = globalState === 'missing' ? '#FEE2E2' : '#E2E8F0';
  const rootStroke = globalState === 'missing' ? '#FCA5A5' : '#CBD5E1';

  return (
    <div className={cn("flex flex-col items-center", !isUpper && "flex-col-reverse")} style={{ userSelect: 'none' }}>
      {/* Número del diente */}
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          color: '#64748B',
          letterSpacing: '0.03em',
          lineHeight: 1,
          marginBottom: isUpper ? '2px' : 0,
          marginTop: isUpper ? 0 : '2px',
          fontFamily: 'monospace',
        }}
      >
        {id}
      </span>

      {/* Raíces */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: isUpper ? 'flex-end' : 'flex-start',
          height: '22px',
          width: '100%',
          transform: !isUpper ? 'rotate(180deg)' : undefined,
          overflow: 'visible',
        }}
      >
        <svg
          viewBox="0 0 60 22"
          width="36"
          height="22"
          style={{ overflow: 'visible' }}
        >
          {isMolar ? (
            <>
              <polygon points="10,22 15,0 20,22" fill={rootColor} stroke={rootStroke} strokeWidth="1.5" strokeLinejoin="round" />
              <polygon points="25,22 30,0 35,22" fill={rootColor} stroke={rootStroke} strokeWidth="1.5" strokeLinejoin="round" />
              <polygon points="40,22 45,0 50,22" fill={rootColor} stroke={rootStroke} strokeWidth="1.5" strokeLinejoin="round" />
            </>
          ) : isPremolar ? (
            <>
              <polygon points="17,22 22,0 27,22" fill={rootColor} stroke={rootStroke} strokeWidth="1.5" strokeLinejoin="round" />
              <polygon points="33,22 38,0 43,22" fill={rootColor} stroke={rootStroke} strokeWidth="1.5" strokeLinejoin="round" />
            </>
          ) : (
            <polygon points="22,22 30,0 38,22" fill={rootColor} stroke={rootStroke} strokeWidth="1.5" strokeLinejoin="round" />
          )}
        </svg>
      </div>

      {/* Corona interactiva */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox="0 0 100 100"
          width={isAnterior ? 30 : 36}
          height={isAnterior ? 30 : 36}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Fondo completo con borde exterior */}
          <rect x="1" y="1" width="98" height="98" rx="4" fill="none" stroke="#334155" strokeWidth="2.5" />

          {/* Superficie: Oclusal superior (vestibular/incisal) */}
          <path
            d="M 3 3 L 97 3 L 73 27 L 27 27 Z"
            fill={getSurfaceColor('top').fill}
            stroke={getSurfaceColor('top').stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="cursor-pointer transition-opacity hover:opacity-75"
            onClick={() => handleClick('top')}
          />

          {/* Superficie: Apical inferior (lingual/palatino) */}
          <path
            d="M 27 73 L 73 73 L 97 97 L 3 97 Z"
            fill={getSurfaceColor('bottom').fill}
            stroke={getSurfaceColor('bottom').stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="cursor-pointer transition-opacity hover:opacity-75"
            onClick={() => handleClick('bottom')}
          />

          {/* Superficie: Mesial (izquierda) */}
          <path
            d="M 3 3 L 27 27 L 27 73 L 3 97 Z"
            fill={getSurfaceColor('left').fill}
            stroke={getSurfaceColor('left').stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="cursor-pointer transition-opacity hover:opacity-75"
            onClick={() => handleClick('left')}
          />

          {/* Superficie: Distal (derecha) */}
          <path
            d="M 97 3 L 97 97 L 73 73 L 73 27 Z"
            fill={getSurfaceColor('right').fill}
            stroke={getSurfaceColor('right').stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="cursor-pointer transition-opacity hover:opacity-75"
            onClick={() => handleClick('right')}
          />

          {/* Superficie: Centro (oclusal) */}
          <rect
            x="27"
            y="27"
            width="46"
            height="46"
            fill={getSurfaceColor('center').fill}
            stroke={getSurfaceColor('center').stroke}
            strokeWidth="1.8"
            className="cursor-pointer transition-opacity hover:opacity-75"
            onClick={() => handleClick('center')}
          />

          {/* Surcos de molares/premolares */}
          {(isMolar || isPremolar) && (
            <g stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" style={{ pointerEvents: 'none' }}>
              <line x1="27" y1="50" x2="73" y2="50" />
              <line x1="50" y1="27" x2="50" y2="73" />
            </g>
          )}

          {/* Estado: Ausente — X roja */}
          {globalState === 'missing' && (
            <g stroke="#DC2626" strokeWidth="9" strokeLinecap="round" style={{ pointerEvents: 'none' }}>
              <line x1="8" y1="8" x2="92" y2="92" />
              <line x1="92" y1="8" x2="8" y2="92" />
            </g>
          )}

          {/* Estado: Corona */}
          {globalState === 'crown' && (
            <circle cx="50" cy="50" r="44" fill="none" stroke="#D97706" strokeWidth="6" strokeDasharray="8 4" style={{ pointerEvents: 'none' }} />
          )}

          {/* Estado: Puente/Póntico */}
          {globalState === 'bridge' && (
            <rect x="0" y="42" width="100" height="16" fill="#A855F7" opacity="0.35" style={{ pointerEvents: 'none' }} />
          )}
        </svg>
      </div>
    </div>
  );
}

// --- SEPARADOR DE CUADRANTE ---
function QuadrantDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 6px',
        color: '#94A3B8',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        userSelect: 'none',
      }}
    >
      <div style={{ width: '2px', height: '100%', background: 'linear-gradient(to bottom, transparent, #CBD5E1, transparent)', minHeight: '80px' }} />
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
function OdontogramContent({ id }: { id: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [teethData, setTeethData] = useState<Record<number, any>>({});
  const [selectedTool, setSelectedTool] = useState<string>('caries');
  const [diagnostic, setDiagnostic] = useState('');

  const [customTools, setCustomTools] = useState([
    { id: 'caries',   label: 'Caries',   color: 'bg-red-500'   },
    { id: 'filling',  label: 'Obturado', color: 'bg-blue-500'  },
    { id: 'healthy',  label: 'Sano',     color: 'bg-white'     },
    { id: 'missing',  label: 'Ausente',  color: 'bg-slate-800' },
    { id: 'crown',    label: 'Corona',   color: 'bg-amber-400' },
    { id: 'bridge',   label: 'Póntico',  color: 'bg-purple-400'},
  ]);

  const [newTool, setNewTool] = useState({ label: '', color: 'bg-emerald-500' });
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const p = await db.getById<Patient>('patients', id);
      if (p) setPatient(p);
      const ods = await db.getAll<Odontogram>('odontograms');
      const patientOdontograms = ods
        .filter(o => o.patientId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (patientOdontograms.length > 0) {
        setTeethData(patientOdontograms[0].data);
        setDiagnostic(patientOdontograms[0].diagnostic || '');
      }
    };
    load();
  }, [id]);

  const handleSurfaceClick = (toothId: number, surface: string) => {
    const currentTooth = teethData[toothId] || { surfaces: {}, globalState: 'none' };
    const currentStatus = currentTooth.surfaces[surface] || 'healthy';
    const newStatus = currentStatus === selectedTool ? 'healthy' : selectedTool;
    setTeethData({ ...teethData, [toothId]: { ...currentTooth, surfaces: { ...currentTooth.surfaces, [surface]: newStatus } } });
  };

  const handleStateToggle = (toothId: number, state: string) => {
    const currentTooth = teethData[toothId] || { surfaces: {}, globalState: 'none' };
    const newGlobalState = currentTooth.globalState === state ? 'none' : state;
    setTeethData({ ...teethData, [toothId]: { ...currentTooth, globalState: newGlobalState } });
  };

  const handleSave = async () => {
    try {
      const od: Odontogram = {
        id: crypto.randomUUID(),
        patientId: id,
        data: teethData,
        diagnostic,
        date: new Date().toISOString(),
      };
      await db.put('odontograms', od);
      toast({ title: 'Guardado', description: 'Estado del odontograma actualizado correctamente.' });
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' });
    }
  };

  const saveTool = () => {
    if (!newTool.label) return;
    if (editingToolId) {
      setCustomTools(prev => prev.map(t => t.id === editingToolId ? { ...t, label: newTool.label, color: newTool.color } : t));
    } else {
      const toolId = `custom_${Date.now()}`;
      setCustomTools([...customTools, { id: toolId, label: newTool.label, color: newTool.color }]);
    }
    setIsToolDialogOpen(false);
    setEditingToolId(null);
  };

  // Conteo de hallazgos para resumen
  const getToolCount = (toolId: string) => {
    let count = 0;
    Object.values(teethData).forEach((t: any) => {
      if (t.globalState === toolId) count++;
      if (t.surfaces) Object.values(t.surfaces).forEach(s => { if (s === toolId) count++; });
    });
    return count;
  };

  if (!patient) return null;

  const toothRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '4px',
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1400px] mx-auto print:p-0">

        {/* ── Header ── */}
        <div className="flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link href={`/patients/${id}`}><ChevronLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Odontograma</p>
              <h2 className="text-xl font-bold leading-tight">{patient.names} {patient.lastNames}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Imprimir
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1.5" /> Guardar
            </Button>
          </div>
        </div>

        {/* ── Paleta de Herramientas ── */}
        <div
          className="print:hidden"
          style={{
            background: 'hsl(var(--muted)/0.4)',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--muted-foreground))', marginRight: '4px' }}>
            Hallazgo:
          </span>
          {customTools.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTool(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: selectedTool === t.id ? '2px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border))',
                background: selectedTool === t.id ? 'hsl(var(--primary)/0.08)' : 'hsl(var(--background))',
                color: selectedTool === t.id ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: selectedTool === t.id ? '0 0 0 3px hsl(var(--primary)/0.15)' : 'none',
              }}
            >
              <span className={cn('w-3 h-3 rounded-full border border-slate-300 flex-shrink-0', t.color)} />
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setIsToolDialogOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1.5px dashed hsl(var(--border))',
              background: 'transparent',
              color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo
          </button>
        </div>

        {/* ── Lienzo del Odontograma ── */}
        <div
          style={{
            background: 'hsl(var(--card))',
            borderRadius: '16px',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            padding: '32px 24px',
            overflow: 'hidden',
          }}
          className="print:shadow-none print:border"
        >

          {/* === ARCADA SUPERIOR PERMANENTE === */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8' }}>
              Arcada Superior — Permanente
            </span>
            <div style={toothRowStyle}>
              <div style={{ display: 'flex', gap: '4px', paddingRight: '12px', borderRight: '2.5px solid #CBD5E1' }}>
                {quad1.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', paddingLeft: '12px' }}>
                {quad2.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
            </div>
          </div>

          {/* === ARCADA SUPERIOR TEMPORAL === */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '20px', opacity: 0.85 }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B0BAC9' }}>
              Temporal Superior
            </span>
            <div style={{ ...toothRowStyle, transform: 'scale(0.88)', transformOrigin: 'center top' }}>
              <div style={{ display: 'flex', gap: '4px', paddingRight: '10px', borderRight: '2px solid #E2E8F0' }}>
                {quad5.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', paddingLeft: '10px' }}>
                {quad6.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
            </div>
          </div>

          {/* === LÍNEA DE OCLUSIÓN === */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '28px 0',
            }}
          >
            <div style={{ flex: 1, height: '1.5px', background: 'linear-gradient(to right, transparent, #CBD5E1 20%, #CBD5E1 80%, transparent)' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94A3B8', whiteSpace: 'nowrap', padding: '2px 12px', border: '1px solid #E2E8F0', borderRadius: '20px' }}>
              Línea de Oclusión
            </span>
            <div style={{ flex: 1, height: '1.5px', background: 'linear-gradient(to left, transparent, #CBD5E1 20%, #CBD5E1 80%, transparent)' }} />
          </div>

          {/* === ARCADA INFERIOR TEMPORAL === */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
            <div style={{ ...toothRowStyle, transform: 'scale(0.88)', transformOrigin: 'center bottom' }}>
              <div style={{ display: 'flex', gap: '4px', paddingRight: '10px', borderRight: '2px solid #E2E8F0' }}>
                {quad8.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', paddingLeft: '10px' }}>
                {quad7.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B0BAC9' }}>
              Temporal Inferior
            </span>
          </div>

          {/* === ARCADA INFERIOR PERMANENTE === */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
            <div style={{ ...toothRowStyle, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '4px', paddingRight: '12px', borderRight: '2.5px solid #CBD5E1' }}>
                {quad4.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', paddingLeft: '12px' }}>
                {quad3.map(t => (
                  <InteractiveTooth key={t} id={t} data={teethData[t]} selectedTool={selectedTool} tools={customTools} onSurfaceClick={handleSurfaceClick} onStateToggle={handleStateToggle} />
                ))}
              </div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94A3B8' }}>
              Arcada Inferior — Permanente
            </span>
          </div>

        </div>

        {/* ── Diagnóstico y Resumen ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            className="md:col-span-2"
            style={{
              background: 'hsl(var(--card))',
              borderRadius: '12px',
              border: '1px solid hsl(var(--border))',
              padding: '20px',
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>
              Diagnóstico Clínico
            </p>
            <Textarea
              placeholder="Ingrese observaciones detalladas del estado bucal del paciente..."
              className="min-h-[140px] resize-none bg-muted/20 text-sm"
              value={diagnostic}
              onChange={e => setDiagnostic(e.target.value)}
            />
          </div>

          <div
            style={{
              background: 'hsl(var(--card))',
              borderRadius: '12px',
              border: '1px solid hsl(var(--border))',
              padding: '20px',
            }}
          >
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>
              Resumen de Hallazgos
            </p>
            <div className="space-y-2">
              {customTools.map(tool => {
                const count = getToolCount(tool.id);
                return count > 0 ? (
                  <div key={tool.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'hsl(var(--foreground))' }}>
                      <span className={cn('w-2.5 h-2.5 rounded-full border border-slate-300 flex-shrink-0', tool.color)} />
                      {tool.label}
                    </span>
                    <Badge variant="secondary" style={{ fontSize: '11px', fontWeight: 700 }}>{count}</Badge>
                  </div>
                ) : null;
              })}
              {customTools.every(t => getToolCount(t.id) === 0) && (
                <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '20px 0' }}>
                  Sin hallazgos registrados
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Diálogo Nueva Herramienta ── */}
        <Dialog open={isToolDialogOpen} onOpenChange={setIsToolDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingToolId ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del hallazgo</Label>
                <Input
                  placeholder="ej. Fractura, Endodoncia..."
                  value={newTool.label}
                  onChange={e => setNewTool({ ...newTool, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color identificador</Label>
                <div className="flex gap-3 flex-wrap">
                  {['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-400', 'bg-purple-400', 'bg-orange-500', 'bg-pink-500', 'bg-slate-800'].map(c => (
                    <div
                      key={c}
                      onClick={() => setNewTool({ ...newTool, color: c })}
                      className={cn(
                        'w-8 h-8 rounded-full cursor-pointer border-[3px] transition-transform hover:scale-110',
                        c,
                        newTool.color === c ? 'border-primary scale-110' : 'border-transparent'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsToolDialogOpen(false)}>Cancelar</Button>
              <Button onClick={saveTool}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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