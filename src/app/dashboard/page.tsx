"use client";

import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, UserSquare2, Stethoscope, Landmark, Image, Activity, FileText, Calendar, Database } from 'lucide-react';
import Link from 'next/link';

const modules = [
  { icon: UserSquare2, title: 'Pacientes', description: 'Registro y historial clínico', href: '/patients', color: 'bg-teal-500' },
  { icon: Stethoscope, title: 'Tratamientos', description: 'Catálogo de servicios y precios', href: '/treatments', color: 'bg-blue-500' },
  { icon: Landmark, title: 'Pagos', description: 'Control de abonos y saldos', href: '/payments', color: 'bg-emerald-500' },
  { icon: Image, title: 'Radiografías', description: 'Archivo digital de imágenes', href: '/radiographs', color: 'bg-cyan-500' },
  { icon: Activity, title: 'Odontograma', description: 'Esquema gráfico interactivo', href: '/odontogram', color: 'bg-indigo-500' },
  { icon: FileText, title: 'Consentimientos', description: 'Documentos legales firmados', href: '/consents', color: 'bg-sky-500' },
  { icon: Calendar, title: 'Citas', description: 'Agenda de pacientes', href: '/appointments', color: 'bg-violet-500' },
  { icon: Users, title: 'Usuarios', description: 'Administración de acceso', href: '/admin/users', color: 'bg-slate-500' },
  { icon: Database, title: 'Respaldo', description: 'Backup y restauración', href: '/backups', color: 'bg-amber-500' },
];

function DashboardContent() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Panel Principal</h2>
          <p className="text-muted-foreground mt-2">Bienvenido al sistema de gestión KuskoDento</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link href={module.href} key={module.href}>
              <Card className="hover:shadow-lg transition-all border-none shadow-sm group cursor-pointer overflow-hidden">
                <div className={`h-2 ${module.color}`} />
                <CardHeader className="flex flex-row items-center gap-4 py-8">
                  <div className={`p-4 rounded-2xl text-white ${module.color} group-hover:scale-110 transition-transform`}>
                    <module.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
