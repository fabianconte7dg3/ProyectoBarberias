/**
 * Dominios raiz conocidos (sin subdominio) — debe coincidir con proxy.ts.
 * `NEXT_PUBLIC_ROOT_HOST` (staging sin DNS wildcard, ver proxy.ts) arma la
 * URL por PATH en vez de subdominio — no hay wildcard DNS que resuelva
 * `<slug>.dominio-de-staging`.
 */
const ROOT_HOSTS = new Set(
  ['localhost', 'volumetrixpa.com', process.env.NEXT_PUBLIC_ROOT_HOST].filter(Boolean) as string[]
);

/**
 * Arma la URL publica absoluta de un tenant (para copiar/compartir/enviar
 * por WhatsApp o email), soportando el esquema de subdominio por tenant.
 *
 * En produccion, si ya se navega dentro del subdominio del tenant,
 * `window.location.origin` ya es correcto tal cual. En dev local (sin
 * `*.localhost` configurado) o parado en el dominio raiz, hay que armar
 * el host del tenant explicitamente.
 */
export function buildTenantPublicUrl(tenantSlug: string, path: string): string {
  const { protocol, hostname, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (hostname === process.env.NEXT_PUBLIC_ROOT_HOST) {
    return `${protocol}//${hostname}${portSuffix}/${tenantSlug}${normalizedPath}`;
  }

  if (!ROOT_HOSTS.has(hostname)) {
    // Ya estamos en un subdominio de tenant (el propio u otro) — reconstruir
    // con el hostname raiz + el slug pedido, no asumir que es el mismo tenant.
    const rootHost = hostname.split('.').slice(1).join('.') || hostname;
    return `${protocol}//${tenantSlug}.${rootHost}${portSuffix}${normalizedPath}`;
  }

  return `${protocol}//${tenantSlug}.${hostname}${portSuffix}${normalizedPath}`;
}
