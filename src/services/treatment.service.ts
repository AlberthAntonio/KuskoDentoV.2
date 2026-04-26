import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const treatmentService = {
  async getByClinic(clinicId: string) {
    return prisma.treatment.findMany({
      where: { clinic_id: clinicId },
      orderBy: { created_at: 'desc' },
    });
  },

  async upsert(clinicId: string, data: { id?: string; name: string; price: number }) {
    const where = {
      clinic_id_name: {
        clinic_id: clinicId,
        name: data.name,
      },
    };

    if (data.id) {
      const existing = await prisma.treatment.findFirst({
        where: { id: data.id, clinic_id: clinicId },
      });

      if (existing) {
        return prisma.treatment.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            price: new Prisma.Decimal(data.price),
          },
        });
      }
    }

    return prisma.treatment.upsert({
      where,
      update: {
        price: new Prisma.Decimal(data.price),
      },
      create: {
        clinic_id: clinicId,
        name: data.name,
        price: new Prisma.Decimal(data.price),
      },
    });
  },

  async remove(clinicId: string, id: string) {
    const existing = await prisma.treatment.findFirst({
      where: { id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Tratamiento no encontrado');
    }

    // Verificar si hay citas o servicios facturados que referencian este tratamiento
    const [appointmentCount, appointmentTreatmentCount] = await Promise.all([
      prisma.appointment.count({ where: { treatment_id: id, clinic_id: clinicId } }),
      prisma.appointmentTreatment.count({ where: { treatment_id: id, clinic_id: clinicId } }),
    ]);

    if (appointmentCount > 0 || appointmentTreatmentCount > 0) {
      throw new Error(
        `No se puede eliminar: este tratamiento está asociado a ${appointmentCount + appointmentTreatmentCount} cita(s). Desasócielo primero.`
      );
    }

    await prisma.treatment.delete({ where: { id: existing.id } });
    return { ok: true };
  },
};
