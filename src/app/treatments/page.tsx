
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Treatment } from '@/lib/legacy-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function TreatmentsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form, setForm] = useState({ name: '', price: '' });

  const clinicId = user?.role === 'clinic' ? user.id : user?.clinicId;

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user || !clinicId) return;
    try {
      const all = await db.getAll<Treatment>('treatments');
      // La API ya devuelve tratamientos del consultorio actual.
      setTreatments(all);
    } catch (error) {
      toast({
        title: 'Error al cargar tratamientos',
        description: error instanceof Error ? error.message : 'No se pudo cargar tratamientos',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const payload = editing
      ? {
          id: editing.id,
          name: form.name,
          price: parseFloat(form.price),
        }
      : {
          name: form.name,
          price: parseFloat(form.price),
        };

    try {
      await db.put('treatments', payload);
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', price: '' });
      toast({ title: editing ? 'Tratamiento actualizado' : 'Tratamiento registrado' });
      load();
    } catch (error) {
      toast({
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Error de registro',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este tratamiento?')) {
      try {
        await db.delete('treatments', id);
        toast({ title: 'Tratamiento eliminado' });
        load();
      } catch (error) {
        toast({
          title: 'No se pudo eliminar',
          description: error instanceof Error ? error.message : 'Error al eliminar',
          variant: 'destructive',
        });
      }
    }
  };

  const openEdit = (t: Treatment) => {
    setEditing(t);
    setForm({ name: t.name, price: t.price.toString() });
    setIsOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Tratamientos</h2>
            <p className="text-muted-foreground mt-1">Configura el catálogo de servicios y precios de la clínica</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setForm({ name: '', price: '' }); }} className="gap-2 h-12">
                <Plus className="w-5 h-5" />
                Nuevo Tratamiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}</DialogTitle>
                <DialogDescription>
                  Completa el nombre y el precio del tratamiento para guardarlo en el catalogo de la clinica.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Servicio</Label>
                  <Input id="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Endodoncia" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio Predeterminado (S/.)</Label>
                  <Input id="price" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" required />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {treatments.map((t) => (
            <Card key={t.id} className="border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-primary">{t.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">S/. {t.price.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-2">Precio de referencia para pacientes</p>
              </CardContent>
            </Card>
          ))}
          {treatments.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              No hay tratamientos registrados. Haz clic en "Nuevo Tratamiento" para comenzar.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function TreatmentsPage() {
  return (
    <AuthProvider>
      <TreatmentsContent />
    </AuthProvider>
  );
}
