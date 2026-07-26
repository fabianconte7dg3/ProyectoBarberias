import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Subdominios que NUNCA se interpretan como slug de tenant. `www` y el
 * dominio raiz sirven la landing/super-admin sin reescribir; `api`/`admin`
 * se excluyen como defensa en profundidad (Caddy ya los rutea a otro
 * contenedor en produccion, esto es solo por si ese ruteo cambia).
 */
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin']);

/** Dominios raiz conocidos (sin subdominio) — dev local y produccion. */
const ROOT_HOSTS = new Set(['localhost', 'volumetrixpa.com']);

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];

  if (ROOT_HOSTS.has(hostname)) {
    return NextResponse.next();
  }

  const firstLabel = hostname.split('.')[0];
  if (RESERVED_SUBDOMAINS.has(firstLabel)) {
    return NextResponse.next();
  }

  // El subdominio ES el slug del tenant, sin tabla de mapeo — [tenantSlug]
  // ya usa el slug crudo como segmento de ruta hoy. La existencia real del
  // tenant la valida [tenantSlug]/layout.tsx contra /tenants/publico/:slug,
  // el proxy no duplica esa llamada en cada request.
  //
  // Idempotencia: el panel de admin construye rutas absolutas con el slug
  // (`/${tenantSlug}/admin/...`, ver AdminHeader/useAdminAuth/admin/login) —
  // en un subdominio de tenant, cualquier `router.push`/`<Link>` a una de
  // esas rutas ya trae el slug puesto. Sin este guard, el rewrite lo
  // duplicaba (`/qa-test/qa-test/admin/agenda`) y todo el panel 404eaba
  // apenas se navegaba dentro de él. Si el path ya empieza con el slug, se
  // deja pasar tal cual.
  const pathname = request.nextUrl.pathname;
  if (pathname === `/${firstLabel}` || pathname.startsWith(`/${firstLabel}/`)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${firstLabel}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
