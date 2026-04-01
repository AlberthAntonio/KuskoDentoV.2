
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, InventoryItem } from '@/lib/legacy-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Boxes, AlertTriangle, Search, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function InventoryContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const clinicId = user?.role === 'clinic' ? user.id : user?.clinicId;

  const [form, setForm] = useState({
    name: '',
    category: 'Material Descartable',
    quantity: '0',
    minQuantity: '5',
    unit: 'Unidades'
  });

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user || !clinicId) return;
    try {
      const all = await db.getAll<InventoryItem>('inventory');
      setItems(all.filter(i => i.clinicId === clinicId));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar inventario',
        description: error instanceof Error ? error.message : 'No se pudo cargar el inventario.',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      name: form.name,
      category: form.category,
      quantity: parseInt(form.quantity),
      minQuantity: parseInt(form.minQuantity),
      unit: form.unit,
      lastUpdated: new Date().toISOString(),
      clinicId: clinicId
    };

    try {
      await db.put('inventory', newItem);
      setIsOpen(false);
      resetForm();
      toast({ title: editingItem ? "Insumo Actualizado" : "Insumo Registrado" });
      load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Error al guardar el insumo.',
      });
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      name: '',
      category: 'Material Descartable',
      quantity: '0',
      minQuantity: '5',
      unit: 'Unidades'
    });
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      minQuantity: item.minQuantity.toString(),
      unit: item.unit
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Desea eliminar este insumo del inventario?')) {
      try {
        await db.delete('inventory', id);
        toast({ title: "Eliminado del inventario" });
        load();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: error instanceof Error ? error.message : 'Error al eliminar el insumo.',
        });
      }
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [
    'Material Descartable',
    'Instrumental',
    'Material de Restauración',
    'Limpieza y Desinfección',
    'Equipos',
    'Ortodoncia',
    'Anestesia',
    'Varios'
  ];

  const units = ['Unidades', 'Cajas', 'Paquetes', 'Frascos', 'Rollos', 'Litros'];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Inventario de Clínica</h2>
            <p className="text-muted-foreground mt-1">Gestión de insumos, materiales y stock crítico</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5" /> Nuevo Insumo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary" /> {editingItem ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}
                </DialogTitle>
                <DialogDescription>Complete los datos para el control de stock.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del Material / Insumo</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="rounded-xl h-11" placeholder="Ej: Guantes de Nitrilo" />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad Actual</Label>
                    <Input type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Mínimo (Alerta)</Label>
                    <Input type="number" min="0" value={form.minQuantity} onChange={e => setForm({...form, minQuantity: e.target.value})} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unidad de Medida</Label>
                  <Select value={form.unit} onValueChange={v => setForm({...form, unit: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl">{editingItem ? 'Actualizar' : 'Guardar en Inventario'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white border-l-4 border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Total Insumos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{items.length}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white border-l-4 border-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground text-red-600">Stock Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{items.filter(i => i.quantity <= i.minQuantity).length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-primary" /> Listado de Stock
                </CardTitle>
                <CardDescription>Visualice y edite los insumos de su clínica</CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar insumo..." 
                  className="pl-10 h-10 rounded-xl" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Insumo / Material</TableHead>
                  <TableHead className="font-bold">Categoría</TableHead>
                  <TableHead className="font-bold">Stock Actual</TableHead>
                  <TableHead className="font-bold">Estado</TableHead>
                  <TableHead className="text-right font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const isLowStock = item.quantity <= item.minQuantity;
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Actualizado: {new Date(item.lastUpdated).toLocaleDateString('es-PE')}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-lg font-black", isLowStock ? "text-red-600" : "text-emerald-600")}>
                          {item.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 hover:bg-red-100">
                            <AlertTriangle className="w-3 h-3" /> STOCK BAJO
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                            DISPONIBLE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/5" onClick={() => openEdit(item)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground bg-slate-50/30">
                      <Boxes className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="font-bold uppercase tracking-widest text-xs">No hay insumos registrados</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function InventoryPage() {
  return (
    <AuthProvider>
      <InventoryContent />
    </AuthProvider>
  );
}
