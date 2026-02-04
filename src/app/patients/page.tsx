"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { UserPlus, Search, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

function PatientsContent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    dni: '',
    names: '',
    lastNames: '',
    age: 0,
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const all = await db.getAll<Patient>('patients');
    setPatients(all);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient: Patient = {
      ...(newPatient as Patient),
      id: crypto.randomUUID(),
      registrationDate: new Date().toLocaleDateString('es-PE'),
    };
    await db.put('patients', patient);
    setIsRegisterOpen(false);
    setNewPatient({ dni: '', names: '', lastNames: '', age: 0, phone: '', address: '' });
    loadPatients();
  };

  const filteredPatients = patients.filter(p => 
    p.dni.includes(search) || 
    p.names.toLowerCase().includes(search.toLowerCase()) || 
    p.lastNames.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Pacientes</h2>
            <p className="text-muted-foreground mt-1">Gestión integral de tu base de pacientes</p>
          </div>
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12">
                <UserPlus className="w-5 h-5" />
                Registrar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nuevo Paciente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegister} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI / Documento</Label>
                  <Input id="dni" value={newPatient.dni} onChange={e => setNewPatient({...newPatient, dni: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Edad</Label>
                  <Input id="age" type="number" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: parseInt(e.target.value)})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="names">Nombres</Label>
                  <Input id="names" value={newPatient.names} onChange={e => setNewPatient({...newPatient, names: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastNames">Apellidos</Label>
                  <Input id="lastNames" value={newPatient.lastNames} onChange={e => setNewPatient({...newPatient, lastNames: e.target.value})} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} required />
                </div>
                <DialogFooter className="col-span-2 pt-4">
                  <Button type="submit" className="w-full">Guardar Registro</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por DNI, nombre o apellido..." 
              className="pl-10 h-11"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>DNI</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.dni}</TableCell>
                      <TableCell>{p.lastNames}, {p.names}</TableCell>
                      <TableCell>{p.age} años</TableCell>
                      <TableCell>{p.phone}</TableCell>
                      <TableCell>{p.registrationDate}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="gap-2">
                          <Link href={`/patients/${p.id}`}>
                            <Eye className="w-4 h-4" />
                            Ver Historial
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No se encontraron pacientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function PatientsPage() {
  return (
    <AuthProvider>
      <PatientsContent />
    </AuthProvider>
  );
}
