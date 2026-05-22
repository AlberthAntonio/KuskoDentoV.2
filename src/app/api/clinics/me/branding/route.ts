import { apiError, apiOk } from '@/lib/api-response';
import { getRequestContext } from '@/lib/request-context';
import { prisma } from '@/lib/prisma';
import { clinicService } from '@/services/clinic.service';

const ALLOWED_ROLES = new Set(['admin', 'clinic', 'clinic_owner', 'clinic_admin']);

function resolveStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : 'Error interno';

  if (message.includes('No autorizado')) return 401;
  if (message.includes('Permisos insuficientes')) return 403;
  if (message.includes('invalido')) return 400;
  if (message.includes('Unique constraint failed') || message.includes('ya existe')) return 409;
  return 500;
}

export async function PUT(request: Request) {
  try {
    const { clinicId, userId } = await getRequestContext();
    if (!clinicId || !userId) {
      return apiError('No autorizado', 401);
    }

    const actor = await prisma.user.findFirst({
      where: { id: userId, clinic_id: clinicId },
      select: { role: true },
    });

    if (!actor) {
      return apiError('No autorizado', 401);
    }

    if (!ALLOWED_ROLES.has(actor.role)) {
      return apiError('Permisos insuficientes', 403);
    }

    const body = (await request.json()) as Record<string, unknown>;

    const MAX_LOGO_URL_LEN = Math.ceil(2 * 1024 * 1024 * 1.4) + 100; // 2 MB antes de base64
    const ALLOWED_LOGO_PREFIXES = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/gif', 'data:image/svg+xml'];

    let logo_url: string | undefined;
    if (typeof body.logoUrl === 'string') {
      if (body.logoUrl.length > MAX_LOGO_URL_LEN) {
        return apiError('El logo supera el límite de 2 MB', 400);
      }
      if (!ALLOWED_LOGO_PREFIXES.some((p) => (body.logoUrl as string).startsWith(p))) {
        return apiError('Formato de logo no permitido. Use JPG, PNG, WEBP, GIF o SVG', 400);
      }
      logo_url = body.logoUrl;
    }

    const updated = await clinicService.updateBranding(clinicId, {
      brandName: typeof body.brandName === 'string' ? body.brandName : undefined,
      primary_color: typeof body.primaryColor === 'string' ? body.primaryColor : undefined,
      slogan: typeof body.slogan === 'string' ? body.slogan : undefined,
      logo_url,
      theme:
        body.theme === 'light' || body.theme === 'dark' || body.theme === 'system'
          ? body.theme
          : undefined,
    });

    return apiOk({ clinic: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return apiError(message, resolveStatus(error));
  }
}
