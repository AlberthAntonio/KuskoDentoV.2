
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, User } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { UserPlus, Search, Eye, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

function PatientsContent() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const clinicId = user?.role === 'clinic' ? user.id : user?.clinicId;

  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    dni: '',
    names: '',
    lastNames: '',
    email: '',
    phone: '',
    address: '',
    underTreatment: false,
    proneToBleeding: false,
    allergicToMeds: false,
    allergiesDetail: '',
    hypertensive: false,
    diabetic: false,
    pregnant: false,
    consultationReason: '',
    diagnostic: '',
    medicalObservations: '',
    attendedBy: '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user || !clinicId) return;
    const allP = await db.getAll<Patient>('patients');
    const allU = await db.getAll<User>('users');
    
    // Filtrar pacientes solo del consultorio actual
    setPatients(allP.filter(p => p.clinicId === clinicId));
    // Filtrar doctores solo del consultorio actual
    setUsers(allU.filter(u => u.id === clinicId || u.clinicId === clinicId));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const dniFinal = newPatient.dni?.trim() === '' ? '00000000' : newPatient.dni;
    
    const patient: Patient = {
      ...(newPatient as Patient),
      id: crypto.randomUUID(),
      dni: dniFinal || '00000000',
      photo: photoPreview || undefined,
      registrationDate: new Date().toLocaleDateString('es-PE'),
      clinicId: clinicId
    };

    await db.put('patients', patient);
    setIsRegisterOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setNewPatient({
      dni: '', names: '', lastNames: '', email: '', phone: '', address: '',
      underTreatment: false, proneToBleeding: false, allergicToMeds: false,
      allergiesDetail: '', hypertensive: false, diabetic: false, pregnant: false,
      consultationReason: '', diagnostic: '', medicalObservations: '', attendedBy: '',
    });
    setPhotoPreview(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.names.toLowerCase().includes(search.toLowerCase()) || 
    p.lastNames.toLowerCase().includes(search.toLowerCase()) ||
    p.dni.includes(search)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Pacientes</h2>
            <p className="text-muted-foreground mt-1">Gestión de Historial Clínico Digital</p>
          </div>
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12">
                <UserPlus className="w-5 h-5" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[95vw] md:max-w-[1000px] h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registro de Paciente e Historia Clínica</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-primary">Datos Personales</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI (Opcional)</Label>
                      <Input id="dni" value={newPatient.dni} onChange={e => setNewPatient({...newPatient, dni: e.target.value.slice(0, 8)})} maxLength={8} placeholder="00000000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Celular</Label>
                      <Input id="phone" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} required />
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
                      <Label htmlFor="email">Correo Electrónico (Opcional)</Label>
                      <Input id="email" type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input id="address" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} required />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Foto (Opcional)</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg bg-muted border flex items-center justify-center overflow-hidden">
                          {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 opacity-20" />}
                        </div>
                        <Input type="file" accept="image/*" onChange={handlePhotoUpload} className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-primary">Anamnesis / Historia</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <Label className="text-xs">Bajo tratamiento</Label>
                      <Switch checked={newPatient.underTreatment} onCheckedChange={v => setNewPatient({...newPatient, underTreatment: v})} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <Label className="text-xs">Hemorragias</Label>
                      <Switch checked={newPatient.proneToBleeding} onCheckedChange={v => setNewPatient({...newPatient, proneToBleeding: v})} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <Label className="text-xs">Hipertenso</Label>
                      <Switch checked={newPatient.hypertensive} onCheckedChange={v => setNewPatient({...newPatient, hypertensive: v})} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <Label className="text-xs">Diabético</Label>
                      <Switch checked={newPatient.diabetic} onCheckedChange={v => setNewPatient({...newPatient, diabetic: v})} />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md col-span-2">
                      <Label className="text-xs">¿Embarazada?</Label>
                      <Switch checked={newPatient.pregnant} onCheckedChange={v => setNewPatient({...newPatient, pregnant: v})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded-md">
                        <Label className="text-xs font-bold text-red-600">Alérgico a medicamentos</Label>
                        <Switch checked={newPatient.allergicToMeds} onCheckedChange={v => setNewPatient({...newPatient, allergicToMeds: v})} />
                      </div>
                      {newPatient.allergicToMeds && (
                        <Input placeholder="¿A qué medicamentos?" value={newPatient.allergiesDetail} onChange={e => setNewPatient({...newPatient, allergiesDetail: e.target.value})} />
                      )}
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Motivo de consulta</Label>
                      <Input value={newPatient.consultationReason} onChange={e => setNewPatient({...newPatient, consultationReason: e.target.value})} required />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Diagnóstico</Label>
                      <Textarea value={newPatient.diagnostic} onChange={e => setNewPatient({...newPatient, diagnostic: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea value={newPatient.medicalObservations} onChange={e => setNewPatient({...newPatient, medicalObservations: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Atendido por</Label>
                      <Select onValueChange={v => setNewPatient({...newPatient, attendedBy: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccione Doctor" /></SelectTrigger>
                        <SelectContent>
                          {users.map(u => <SelectItem key={u.id} value={u.fullName || u.username}>{u.fullName || u.username}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter className="col-span-full pt-6 border-t mt-4">
                  <Button type="submit" className="w-full h-12 text-lg">Guardar Paciente</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por DNI, Nombres o Apellidos..." 
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
                  <TableHead>Celular</TableHead>
                  <TableHead>Atendido por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.dni}</TableCell>
                      <TableCell className="font-bold">{p.lastNames}, {p.names}</TableCell>
                      <TableCell>{p.phone}</TableCell>
                      <TableCell>Dr. {p.attendedBy || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="gap-2">
                          <Link href={`/patients/${p.id}`}>
                            <Eye className="w-4 h-4" /> Historial
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                       No hay pacientes que coincidan con la búsqueda
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
