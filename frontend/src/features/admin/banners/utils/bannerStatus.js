/**
 * Estado de un banner, derivado de su bandera activa y su vigencia.
 *
 * `RN-73`: orden, vigencia y estado activo son campos propios del banner.
 * `RN-74`: sin vigencia definida, el banner es permanente mientras esté activo
 * —de ahí que aquí `starts_at` pueda faltar, a diferencia de las promociones,
 * donde es obligatorio.
 *
 * Esto **no decide qué banner publica el catálogo**: esa lectura la resuelve el
 * backend (`banner_service`). Aquí solo se etiqueta lo que el panel muestra,
 * con los mismos campos que el servidor evalúa.
 */
export const BANNER_STATUS = {
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
};

export const STATUS_LABELS = {
  [BANNER_STATUS.ACTIVE]: { label: 'Vigente', tone: 'success' },
  [BANNER_STATUS.SCHEDULED]: { label: 'Programado', tone: 'info' },
  [BANNER_STATUS.EXPIRED]: { label: 'Expirado', tone: 'secondary' },
  [BANNER_STATUS.INACTIVE]: { label: 'Inactivo', tone: 'warning' },
};

/**
 * @param banner `BannerAdminDTO` (05_API.md §10.3).
 * @param now Instante de evaluación; parametrizable para poder probarlo.
 */
export function getBannerStatus(banner, now = new Date()) {
  // La bandera manda: si el administrador lo apagó, da igual en qué ventana
  // esté. Es lo que él ve cuando lo desactiva.
  if (!banner?.is_active) return BANNER_STATUS.INACTIVE;

  const inicio = parseDate(banner.starts_at);
  const fin = parseDate(banner.ends_at);

  if (fin && fin.getTime() <= now.getTime()) return BANNER_STATUS.EXPIRED;
  if (inicio && inicio.getTime() > now.getTime()) return BANNER_STATUS.SCHEDULED;

  // `RN-74`: sin fechas, permanente mientras siga activo.
  return BANNER_STATUS.ACTIVE;
}

export function describeBannerStatus(banner, now = new Date()) {
  return STATUS_LABELS[getBannerStatus(banner, now)];
}

/** Una fecha ilegible se trata como ausente: no se inventa una ventana. */
function parseDate(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
