import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/hash';
import type { AdminReportsPayload, AdminUser, AdminUserRole, SubscriptionPayment, SubscriptionStatus } from '@/types/admin';

const DEFAULT_SUBSCRIPTION_FEE = 50;
const KNOWN_ROLES: AdminUserRole[] = ['admin', 'clinic', 'doctor', 'assistant', 'technician'];

type Actor = {
  id: string;
  clinicId: string;
  role: string;
  username?: string | null;
  email?: string | null;
};

type SaveUserInput = {
  id?: string;
  username?: string;
  password?: string;
  fullName?: string;
  dni?: string;
  address?: string;
  colegiatura?: string;
  role?: AdminUserRole;
  subscriptionStatus?: SubscriptionStatus;
  nextPaymentDate?: string;
  contractStartDate?: string;
  paymentFrequency?: 'monthly' | 'yearly';
  photo?: string;
};

type RegisterPaymentInput = {
  clinicId: string;
  amount?: number;
  installments?: number;
  nextPaymentDate?: string;
  concept?: string;
};

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function addMonthsSafe(base: Date, months: number): Date {
  const date = new Date(base);
  date.setMonth(date.getMonth() + Math.max(1, months));
  return date;
}

function toDateOnly(value?: Date | null): string | undefined {
  if (!value) return undefined;
  return value.toISOString().split('T')[0];
}

function normalizeStatus(value?: string | null): SubscriptionStatus {
  if (value === 'blocked' || value === 'suspended' || value === 'active') {
    return value;
  }
  return 'active';
}

function normalizeRole(value?: string | null): AdminUserRole {
  if (!value) return 'doctor';
  if ((KNOWN_ROLES as string[]).includes(value)) {
    return value as AdminUserRole;
  }
  return 'doctor';
}

function clean(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function slugify(input: string): string {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  return normalized || `clinic-${Date.now()}`;
}

async function uniqueDomain(baseInput: string): Promise<string> {
  const base = slugify(baseInput);
  let candidate = base;
  let i = 1;

  while (true) {
    const exists = await prisma.clinic.findUnique({
      where: { domain: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;

    candidate = `${base}-${i}`;
    i += 1;
  }
}

function mapClinicToAdminUser(clinic: {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  subscription_status: string;
  next_payment_date: Date | null;
  contract_start_date: Date | null;
  created_by: string | null;
  users: Array<{
    username: string | null;
    dni: string | null;
    status: string;
    address: string | null;
    colegiatura: string | null;
    photo_url: string | null;
  }>;
}): AdminUser {
  const owner = clinic.users[0];

  return {
    id: clinic.id,
    clinicId: clinic.id,
    role: 'clinic',
    username: owner?.username ?? undefined,
    fullName: clinic.name,
    dni: owner?.dni ?? undefined,
    address: clinic.address ?? owner?.address ?? undefined,
    colegiatura: owner?.colegiatura ?? undefined,
    photo: clinic.logo_url ?? owner?.photo_url ?? undefined,
    status: owner?.status === 'inactive' ? 'inactive' : 'active',
    subscriptionFee: DEFAULT_SUBSCRIPTION_FEE,
    subscriptionStatus: normalizeStatus(clinic.subscription_status),
    nextPaymentDate: toDateOnly(clinic.next_payment_date),
    contractStartDate: toDateOnly(clinic.contract_start_date),
    paymentFrequency: 'monthly',
    registeredByAdminId: clinic.created_by ?? undefined,
  };
}

function mapStaffToAdminUser(user: {
  id: string;
  clinic_id: string;
  username: string | null;
  role: string;
  full_name: string | null;
  dni: string | null;
  colegiatura: string | null;
  address: string | null;
  photo_url: string | null;
  status: string;
}): AdminUser {
  return {
    id: user.id,
    clinicId: user.clinic_id,
    role: normalizeRole(user.role),
    username: user.username ?? undefined,
    fullName: user.full_name ?? undefined,
    dni: user.dni ?? undefined,
    colegiatura: user.colegiatura ?? undefined,
    address: user.address ?? undefined,
    photo: user.photo_url ?? undefined,
    status: user.status === 'inactive' ? 'inactive' : 'active',
    subscriptionStatus: 'active',
    paymentFrequency: 'monthly',
  };
}

function isAdmin(actor: Actor): boolean {
  return actor.role === 'admin';
}

function isClinic(actor: Actor): boolean {
  return actor.role === 'clinic';
}

async function buildActor(userId: string, clinicId: string): Promise<Actor | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, clinic_id: clinicId },
    select: {
      id: true,
      clinic_id: true,
      role: true,
      username: true,
      email: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    clinicId: user.clinic_id,
    role: user.role,
    username: user.username,
    email: user.email,
  };
}

export const adminService = {
  async getActor(userId: string, clinicId: string): Promise<Actor | null> {
    return buildActor(userId, clinicId);
  },

  async listUsers(actor: Actor): Promise<AdminUser[]> {
    if (isAdmin(actor)) {
      const clinics = await prisma.clinic.findMany({
        include: {
          users: {
            where: { role: 'clinic' },
            take: 1,
            orderBy: { created_at: 'asc' },
            select: {
              username: true,
              dni: true,
              status: true,
              address: true,
              colegiatura: true,
              photo_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return clinics.map(mapClinicToAdminUser);
    }

    if (isClinic(actor)) {
      const staff = await prisma.user.findMany({
        where: {
          clinic_id: actor.clinicId,
          NOT: { role: 'clinic' },
        },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          clinic_id: true,
          username: true,
          role: true,
          full_name: true,
          dni: true,
          colegiatura: true,
          address: true,
          photo_url: true,
          status: true,
        },
      });

      return staff.map(mapStaffToAdminUser);
    }

    throw new Error('Permisos insuficientes');
  },

  async createUser(actor: Actor, input: SaveUserInput): Promise<AdminUser> {
    if (isAdmin(actor)) {
      const fullName = clean(input.fullName);
      const username = clean(input.username);
      const password = clean(input.password);

      if (!fullName) throw new Error('El nombre del consultorio es obligatorio');
      if (!username) throw new Error('El usuario del consultorio es obligatorio');
      if (!password || password.length < 8) throw new Error('La clave debe tener al menos 8 caracteres');

      const domain = await uniqueDomain(username || fullName);
      const createdBy = actor.username ?? actor.email ?? actor.id;
      const contractStartDate = parseDate(input.contractStartDate);
      const nextPaymentDate = parseDate(input.nextPaymentDate) ?? (contractStartDate ? addMonthsSafe(contractStartDate, 1) : undefined);
      const passwordHash = await hashPassword(password);

      const created = await prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.create({
          data: {
            name: fullName,
            domain,
            address: clean(input.address),
            logo_url: clean(input.photo),
            created_by: createdBy,
            subscription_status: input.subscriptionStatus ?? 'active',
            contract_start_date: contractStartDate,
            next_payment_date: nextPaymentDate,
          },
          include: {
            users: {
              where: { role: 'clinic' },
              take: 1,
              orderBy: { created_at: 'asc' },
              select: {
                username: true,
                dni: true,
                status: true,
                address: true,
                colegiatura: true,
                photo_url: true,
              },
            },
          },
        });

        await tx.user.create({
          data: {
            clinic_id: clinic.id,
            username,
            password_hash: passwordHash,
            role: 'clinic',
            full_name: fullName,
            dni: clean(input.dni),
            address: clean(input.address),
            photo_url: clean(input.photo),
            status: 'active',
          },
        });

        return tx.clinic.findUniqueOrThrow({
          where: { id: clinic.id },
          include: {
            users: {
              where: { role: 'clinic' },
              take: 1,
              orderBy: { created_at: 'asc' },
              select: {
                username: true,
                dni: true,
                status: true,
                address: true,
                colegiatura: true,
                photo_url: true,
              },
            },
          },
        });
      });

      return mapClinicToAdminUser(created);
    }

    if (isClinic(actor)) {
      const fullName = clean(input.fullName);
      if (!fullName) throw new Error('El nombre del colaborador es obligatorio');

      const password = clean(input.password);
      const passwordHash = await hashPassword(password && password.length >= 8 ? password : '12345678');

      const created = await prisma.user.create({
        data: {
          clinic_id: actor.clinicId,
          username: clean(input.username),
          password_hash: passwordHash,
          role: input.role && input.role !== 'clinic' ? input.role : 'doctor',
          full_name: fullName,
          dni: clean(input.dni),
          address: clean(input.address),
          colegiatura: clean(input.colegiatura),
          photo_url: clean(input.photo),
          status: 'active',
        },
        select: {
          id: true,
          clinic_id: true,
          username: true,
          role: true,
          full_name: true,
          dni: true,
          colegiatura: true,
          address: true,
          photo_url: true,
          status: true,
        },
      });

      return mapStaffToAdminUser(created);
    }

    throw new Error('Permisos insuficientes');
  },

  async updateUser(actor: Actor, input: SaveUserInput & { id: string }): Promise<AdminUser> {
    if (isAdmin(actor)) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: input.id },
        include: {
          users: {
            where: { role: 'clinic' },
            take: 1,
            orderBy: { created_at: 'asc' },
            select: {
              username: true,
              dni: true,
              status: true,
              address: true,
              colegiatura: true,
              photo_url: true,
            },
          },
        },
      });

      if (!clinic) throw new Error('Consultorio no encontrado');

      const parsedNextDate = parseDate(input.nextPaymentDate);
      const parsedContractStart = parseDate(input.contractStartDate);
      const resolvedNextPaymentDate = parsedNextDate ?? (parsedContractStart ? addMonthsSafe(parsedContractStart, 1) : undefined);
      const updatedBy = actor.username ?? actor.email ?? actor.id;

      await prisma.clinic.update({
        where: { id: clinic.id },
        data: {
          name: clean(input.fullName) ?? clinic.name,
          address: clean(input.address) ?? clinic.address,
          logo_url: clean(input.photo) ?? clinic.logo_url,
          subscription_status: input.subscriptionStatus ?? clinic.subscription_status,
          next_payment_date: resolvedNextPaymentDate ?? clinic.next_payment_date,
          contract_start_date: parsedContractStart ?? clinic.contract_start_date,
          created_by: clinic.created_by ?? updatedBy,
        },
      });

      const owner = await prisma.user.findFirst({
        where: { clinic_id: clinic.id, role: 'clinic' },
        orderBy: { created_at: 'asc' },
        select: { id: true },
      });

      const cleanPassword = clean(input.password);
      const passwordHash = cleanPassword && cleanPassword.length >= 8
        ? await hashPassword(cleanPassword)
        : undefined;

      if (owner) {
        await prisma.user.update({
          where: { id: owner.id },
          data: {
            username: clean(input.username),
            password_hash: passwordHash,
            full_name: clean(input.fullName),
            dni: clean(input.dni),
            address: clean(input.address),
            photo_url: clean(input.photo),
            status: 'active',
          },
        });
      } else {
        const fallbackPasswordHash = await hashPassword(cleanPassword && cleanPassword.length >= 8 ? cleanPassword : '12345678');

        await prisma.user.create({
          data: {
            clinic_id: clinic.id,
            username: clean(input.username),
            password_hash: fallbackPasswordHash,
            role: 'clinic',
            full_name: clean(input.fullName) ?? clinic.name,
            dni: clean(input.dni),
            address: clean(input.address),
            photo_url: clean(input.photo),
            status: 'active',
          },
        });
      }

      const refreshed = await prisma.clinic.findUniqueOrThrow({
        where: { id: clinic.id },
        include: {
          users: {
            where: { role: 'clinic' },
            take: 1,
            orderBy: { created_at: 'asc' },
            select: {
              username: true,
              dni: true,
              status: true,
              address: true,
              colegiatura: true,
              photo_url: true,
            },
          },
        },
      });

      return mapClinicToAdminUser(refreshed);
    }

    if (isClinic(actor)) {
      const target = await prisma.user.findFirst({
        where: {
          id: input.id,
          clinic_id: actor.clinicId,
          NOT: { role: 'clinic' },
        },
        select: { id: true },
      });

      if (!target) throw new Error('Colaborador no encontrado');

      const cleanPassword = clean(input.password);
      const passwordHash = cleanPassword && cleanPassword.length >= 8
        ? await hashPassword(cleanPassword)
        : undefined;

      const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
          username: clean(input.username),
          password_hash: passwordHash,
          role: input.role && input.role !== 'clinic' ? input.role : undefined,
          full_name: clean(input.fullName),
          dni: clean(input.dni),
          address: clean(input.address),
          colegiatura: clean(input.colegiatura),
          photo_url: clean(input.photo),
        },
        select: {
          id: true,
          clinic_id: true,
          username: true,
          role: true,
          full_name: true,
          dni: true,
          colegiatura: true,
          address: true,
          photo_url: true,
          status: true,
        },
      });

      return mapStaffToAdminUser(updated);
    }

    throw new Error('Permisos insuficientes');
  },

  async deleteUser(actor: Actor, id: string): Promise<{ ok: true }> {
    if (isAdmin(actor)) {
      const exists = await prisma.clinic.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new Error('Consultorio no encontrado');

      await prisma.clinic.delete({ where: { id } });
      return { ok: true };
    }

    if (isClinic(actor)) {
      const target = await prisma.user.findFirst({
        where: {
          id,
          clinic_id: actor.clinicId,
          NOT: { role: 'clinic' },
        },
        select: { id: true },
      });

      if (!target) throw new Error('Colaborador no encontrado');
      await prisma.user.delete({ where: { id: target.id } });
      return { ok: true };
    }

    throw new Error('Permisos insuficientes');
  },

  async listSubscriptionPayments(actor: Actor): Promise<SubscriptionPayment[]> {
    if (!isAdmin(actor)) throw new Error('Permisos insuficientes');

    const clinics = await prisma.clinic.findMany({
      orderBy: { updated_at: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        updated_at: true,
        subscription_status: true,
        next_payment_date: true,
      },
    });

    return clinics.map((clinic) => ({
      id: `sub-${clinic.id}-${clinic.updated_at.getTime()}`,
      clinicId: clinic.id,
      clinicName: clinic.name,
      amount: DEFAULT_SUBSCRIPTION_FEE,
      date: toDateOnly(clinic.updated_at) ?? toDateOnly(new Date())!,
      status: clinic.subscription_status === 'active' ? 'paid' : 'pending',
      concept: clinic.next_payment_date
        ? `Vigencia registrada hasta ${toDateOnly(clinic.next_payment_date)}`
        : 'Sin vigencia registrada',
      processedByAdminId: actor.username ?? actor.email ?? actor.id,
    }));
  },

  async registerSubscriptionPayment(actor: Actor, input: RegisterPaymentInput): Promise<SubscriptionPayment> {
    if (!isAdmin(actor)) throw new Error('Permisos insuficientes');

    const clinic = await prisma.clinic.findUnique({
      where: { id: input.clinicId },
      select: { id: true, name: true },
    });

    if (!clinic) throw new Error('Consultorio no encontrado');

    const installments = Math.max(1, input.installments ?? 1);
    const amount = input.amount && input.amount > 0 ? input.amount : DEFAULT_SUBSCRIPTION_FEE * installments;
    const nextPaymentDate = parseDate(input.nextPaymentDate);

    await prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        subscription_status: 'active',
        ...(nextPaymentDate ? { next_payment_date: nextPaymentDate } : {}),
      },
    });

    return {
      id: `sub-${clinic.id}-${Date.now()}`,
      clinicId: clinic.id,
      clinicName: clinic.name,
      amount,
      date: toDateOnly(new Date())!,
      status: 'paid',
      concept: input.concept ?? `Renovacion: ${installments} cuota(s)`,
      processedByAdminId: actor.username ?? actor.email ?? actor.id,
    };
  },

  async getReports(actor: Actor): Promise<AdminReportsPayload> {
    if (!isAdmin(actor)) throw new Error('Permisos insuficientes');

    const now = new Date();
    const firstWindowMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalClinics,
      totalPatients,
      totalAppointments,
      paymentSummary,
      clinicsDistribution,
      paymentsWindow,
    ] = await Promise.all([
      prisma.clinic.count(),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.payment.aggregate({ _sum: { total_paid: true } }),
      prisma.clinic.findMany({
        take: 5,
        orderBy: {
          patients: {
            _count: 'desc',
          },
        },
        select: {
          name: true,
          _count: {
            select: { patients: true },
          },
        },
      }),
      prisma.payment.findMany({
        where: {
          created_at: { gte: firstWindowMonth },
        },
        select: { created_at: true },
      }),
    ]);

    const monthFormatter = new Intl.DateTimeFormat('es-PE', { month: 'short' });
    const monthBuckets = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const rawLabel = monthFormatter.format(date).replace('.', '');
      return {
        key,
        name: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
        value: 0,
      };
    });

    const bucketMap = new Map(monthBuckets.map((entry) => [entry.key, entry]));
    for (const row of paymentsWindow) {
      const key = `${row.created_at.getFullYear()}-${row.created_at.getMonth()}`;
      const bucket = bucketMap.get(key);
      if (bucket) bucket.value += 1;
    }

    const totalRevenue = Number(paymentSummary._sum.total_paid ?? 0);

    return {
      clinicsData: clinicsDistribution.map((item) => ({
        name: item.name,
        patients: item._count.patients,
      })),
      growthData: monthBuckets.map(({ name, value }) => ({ name, value })),
      stats: {
        totalClinics,
        totalPatients,
        totalAppointments,
        totalRevenue,
      },
    };
  },
};
