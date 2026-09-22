import { safeHref } from '../../../shared/utils/safeLink.js';
import { catalogHref } from './navAxes.js';

/**
 * Acciones de la portada.
 *
 * v2.8.0 las había fijado para que no cambiaran al rotar de pieza. Se revierte
 * esa parte a propósito: el formulario del panel pide «Enlace» y «Texto del
 * botón» para la zona `hero`, así que ignorarlos convertía esos campos en una
 * promesa falsa —se guardaban bien y no hacían nada—.
 *
 * La acción **secundaria** sigue siendo fija: sirve de salida constante hacia
 * promociones aunque la pieza activa no configure nada.
 */
const CONTACT_HREF = '/contacto';
const CONTACT_LABEL = 'Contacto';
const PROMOTIONS_HREF = catalogHref({ onSale: true });

/**
 * La acción principal de una pieza: la suya si está configurada, la de contacto
 * si no.
 *
 * Hacen falta **los dos** valores. Con sólo el enlace no hay texto que poner en
 * el botón, y con sólo el texto no hay destino: en cualquiera de los dos casos
 * saldría un CTA incompleto, así que se cae al fallback entero.
 *
 * El enlace pasa por `safeHref`, que sólo admite ruta interna o `http(s)`. El
 * backend acota la longitud de `link_url` pero no el esquema, de modo que un
 * `javascript:` guardado —hoy, o antes de que el formulario validara— no puede
 * llegar a un `href`.
 */
export function heroPrimaryAction(banner) {
  const destino = safeHref(banner?.link_url);
  const etiqueta = typeof banner?.button_label === 'string' ? banner.button_label.trim() : '';

  if (!destino || !etiqueta) {
    return { href: CONTACT_HREF, label: CONTACT_LABEL, custom: false };
  }
  return { href: destino, label: etiqueta, custom: true };
}

export { CONTACT_HREF, CONTACT_LABEL, PROMOTIONS_HREF };
