import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/hash';
import { signJWT } from '@/lib/jwt';
import type { JwtClaimsDTO } from '@/types/dto';

const DEFAULT_SUBSCRIPTION_FEE = 50;

interface LoginInput {
  identifier?: string;
  id?: string;
  username?: string;
  email?: string;
  password: string;
  clinic_id?: string;
}

export const authService = {
  async login({ identifier, id, username, email, password, clinic_id }: LoginInput) {
    const loginIdentifier = (identifier || id || username || email || '').trim();
    if (!loginIdentifier) {
      throw new Error('Credenciales invalidas');
    }

    const user = await prisma.user.findFirst({
      where: {
        ...(clinic_id ? { clinic_id } : {}),
        OR: [
          { id: loginIdentifier },
          { email: loginIdentifier },
          { username: loginIdentifier },
          { dni: loginIdentifier },
        ],
        status: 'active',
      },
      include: {
        clinic: true,
      },
    });

    if (!user || !user.password_hash) {
      throw new Error('Credenciales invalidas');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Credenciales invalidas');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    const token = signJWT(
      {
        sub: user.id,
        clinic_id: user.clinic_id,
        role: user.role,
      } satisfies JwtClaimsDTO,
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
    );

    const clinic = user.clinic as typeof user.clinic & {
      primary_color?: string | null;
      slogan?: string | null;
      subscription_fee?: Prisma.Decimal | number | null;
    };

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        dni: user.dni,
        role: user.role,
        clinic_id: user.clinic_id,
      },
      clinic: {
        id: clinic.id,
        name: clinic.name,
        domain: clinic.domain,
        logo_url: clinic.logo_url,
        primary_color: clinic.primary_color,
        slogan: clinic.slogan,
        theme: clinic.theme,
        subscription_fee: Number(clinic.subscription_fee ?? DEFAULT_SUBSCRIPTION_FEE),
        subscription_status: clinic.subscription_status,
        next_payment_date: clinic.next_payment_date,
      },
    };
  },

  async me(userId: string, clinicId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, clinic_id: clinicId },
      include: { clinic: true },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const clinic = user.clinic as typeof user.clinic & {
      primary_color?: string | null;
      slogan?: string | null;
      subscription_fee?: Prisma.Decimal | number | null;
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        dni: user.dni,
        role: user.role,
        clinic_id: user.clinic_id,
      },
      clinic: {
        id: clinic.id,
        name: clinic.name,
        domain: clinic.domain,
        logo_url: clinic.logo_url,
        primary_color: clinic.primary_color,
        slogan: clinic.slogan,
        theme: clinic.theme,
        subscription_fee: Number(clinic.subscription_fee ?? DEFAULT_SUBSCRIPTION_FEE),
        subscription_status: clinic.subscription_status,
        next_payment_date: clinic.next_payment_date,
      },
    };
  },

  async getUserIdentity(userId: string, clinicId: string) {
    return prisma.user.findFirst({
      where: { id: userId, clinic_id: clinicId },
      select: {
        id: true,
        role: true,
        clinic_id: true,
        email: true,
      },
    });
  },
};
