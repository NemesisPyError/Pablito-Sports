/**
 * Estado de una promoción, derivado de sus propias fechas y su bandera activa.
 *
 * `RN-32`: una oferta está vigente si el momento actual cae dentro de su rango;
 * fuera de él no aplica aunque el descuento esté cargado. `RN-33`: sin fecha de
 * fin rige indefinidamente.
 *
 * Esto **no recalcula el precio efectivo** ni `totals.on_sale`: eso lo resuelve
 * el backend (`RN-37`). Aquí solo se etiqueta el estado de una promoción
 * concreta, que es lo que el panel necesita mostrar.
 */
export const PROMOTION_STATUS = {
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
};

export const STATUS_LABELS = {
  [PROMOTION_STATUS.ACTIVE]: { label: 'Vigente', tone: 'success' },
  [PROMOTION_STATUS.SCHEDULED]: { label: 'Programada', tone: 'info' },
  [PROMOTION_STATUS.EXPIRED]: { label: 'Expirada', tone: 'secondary' },
  [PROMOTION_STATUS.INACTIVE]: { label: 'Inactiva', tone: 'warning' },
};

/**
 * @param promotion `PromotionDTO` (05_API.md §10.9).
 * @param now Instante de evaluación; parametrizable para poder probarlo.
 */
export function getPromotionStatus(promotion, now = new Date()) {
  // La bandera manda: si el administrador la apagó, da igual en qué ventana
  // esté. Es lo que él ve cuando la desactiva.
  if (!promotion?.is_active) return PROMOTION_STATUS.INACTIVE;

  const inicio = promotion.starts_at ? new Date(promotion.starts_at) : null;
  const fin = promotion.ends_at ? new Date(promotion.ends_at) : null;

  if (fin && fin.getTime() <= now.getTime()) return PROMOTION_STATUS.EXPIRED;
  if (inicio && inicio.getTime() > now.getTime()) return PROMOTION_STATUS.SCHEDULED;

  // `RN-33`: sin fecha de fin, rige indefinidamente.
  return PROMOTION_STATUS.ACTIVE;
}

export function describePromotionStatus(promotion, now = new Date()) {
  return STATUS_LABELS[getPromotionStatus(promotion, now)];
}

/**
 * `RN-36` (v1.6.0): como máximo uno de los tres alcances con entidad; `ALL`
 * no tiene entidad propia y no lleva campo en `SCOPE_FIELD` — el payload no
 * manda ninguno de los tres FK cuando se elige.
 */
export const SCOPE_TYPES = {
  BRAND: 'brand',
  CATEGORY: 'category',
  PRODUCT: 'product',
  ALL: 'all',
};

export const SCOPE_LABELS = {
  [SCOPE_TYPES.BRAND]: 'Marca',
  [SCOPE_TYPES.CATEGORY]: 'Categoría',
  [SCOPE_TYPES.PRODUCT]: 'Producto',
  [SCOPE_TYPES.ALL]: 'Todos los productos',
};

/** Campo del payload que corresponde a cada tipo de alcance con entidad. */
export const SCOPE_FIELD = {
  [SCOPE_TYPES.BRAND]: 'brand_id',
  [SCOPE_TYPES.CATEGORY]: 'category_id',
  [SCOPE_TYPES.PRODUCT]: 'product_id',
};
