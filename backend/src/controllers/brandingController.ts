import { Request, Response } from 'express';
import { z } from 'zod';
import { rawPrisma } from '../utils/prisma';
import { ok } from '../core/http';

export const brandingQuerySchema = z.object({
  slug: z.string().min(1).max(64).optional(),
});

const DEFAULTS = {
  brandName: 'THEORY',
  primaryColor: '#5457E5',
  accentColor: null as string | null,
  logoUrl: null as string | null,
  loginTagline: null as string | null,
};

/**
 * GET /api/branding?slug=acme  (public, pre-auth)
 * Tenant-driven branding for the login/shell. NO hardcoded branding in the FE.
 * Resolves by tenant slug; falls back to the default tenant, then to DEFAULTS.
 */
export async function getBranding(req: Request, res: Response): Promise<void> {
  const { slug } = req.query as z.infer<typeof brandingQuerySchema>;

  const tenant = await rawPrisma.tenant.findFirst({
    where: slug ? { slug } : { slug: 'default' },
    select: { id: true, name: true },
  });

  const settings = tenant
    ? await rawPrisma.tenantSettings.findUnique({
        where: { tenantId: tenant.id },
        select: {
          brandName: true, primaryColor: true,
          accentColor: true, logoUrl: true, loginTagline: true,
        },
      })
    : null;

  ok(res, settings ?? DEFAULTS);
}
