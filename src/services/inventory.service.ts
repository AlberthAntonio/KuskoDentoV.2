import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const inventoryService = {
  async getByClinic(clinicId: string) {
    return prisma.inventoryItem.findMany({
      where: { clinic_id: clinicId },
      orderBy: { updated_at: 'desc' },
    });
  },

  async upsert(clinicId: string, data: {
    id?: string;
    name: string;
    category?: string;
    quantity: number;
    min_quantity: number;
    unit?: string;
    unit_cost?: number;
  }) {
    const description = data.unit ? `UNIT:${data.unit}` : undefined;

    if (data.id) {
      const existing = await prisma.inventoryItem.findFirst({
        where: { id: data.id, clinic_id: clinicId },
      });

      if (existing) {
        return prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            category: data.category,
            quantity: data.quantity,
            min_quantity: data.min_quantity,
            description,
            unit_cost: new Prisma.Decimal(data.unit_cost ?? 0),
          },
        });
      }
    }

    return prisma.inventoryItem.create({
      data: {
        clinic_id: clinicId,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        min_quantity: data.min_quantity,
        description,
        unit_cost: new Prisma.Decimal(data.unit_cost ?? 0),
      },
    });
  },

  async remove(clinicId: string, id: string) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, clinic_id: clinicId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Item de inventario no encontrado');
    }

    await prisma.inventoryItem.delete({ where: { id: existing.id } });
    return { ok: true };
  },
};
