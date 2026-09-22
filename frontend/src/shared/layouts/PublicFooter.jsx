import { Link } from 'react-router-dom';

import { useBanks } from '../../features/store/hooks/useBanks.js';
import { simpleWhatsAppHref } from '../../shared/utils/whatsapp.js';
import styles from './PublicFooter.module.css';

/** Nombre presentable de una red a partir de su clave en `social_links`. */
function socialLabel(clave) {
  return clave.charAt(0).toUpperCase() + clave.slice(1);
}

/**
 * Formas de pago (v2.9.2, confirmado por el usuario; descripciones sumadas
 * en v2.9.6): texto fijo, no dato de `store_settings` — no hay campo
 * administrable para medios de pago en el modelo, y el pie no debe afirmar
 * más de lo que el negocio confirmó por escrito acá. Las descripciones son
 * una reformulación neutra de cada método, no un compromiso comercial nuevo.
 */
const PAYMENT_METHODS = [
  { label: 'Tarjeta de Crédito/Débito', description: 'Aboná con tu tarjeta', icon: 'card' },
  { label: 'Pago Contra Entrega', description: 'Pagá cuando recibas tu pedido', icon: 'truck' },
  { label: 'Transferencia Bancaria', description: 'Realizá tu pago por transferencia', icon: 'bank' },
];

/**
 * Enlaces "Soporte": los cuatro primeros llevan a `LegalPage`, con los textos
 * legales aprobados por el cliente el 11/09/2026. "Contacto" es su propia
 * página.
 */
const SUPPORT_LINKS = [
  { to: '/politica-envios', label: 'Política de Envío y Reembolso', icon: 'truck' },
  { to: '/preguntas-frecuentes', label: 'Preguntas Frecuentes', icon: 'help' },
  { to: '/terminos', label: 'Términos del Servicio', icon: 'doc' },
  { to: '/politica-privacidad', label: 'Política de Privacidad', icon: 'shield' },
  { to: '/contacto', label: 'Contacto', icon: 'mail' },
];

const SOCIAL_ICON = { instagram: 'instagram', facebook: 'facebook' };

/**
 * Color de marca de cada red, solo para el círculo del ícono en "Redes
 * sociales" (v2.9.7, pedido explícito del usuario). Única excepción a
 * "no inventar colores fuera de los tokens" en este componente: no son
 * colores de la identidad de Pablito Sports, son los colores reales con los
 * que cada red se reconoce — mismo criterio que un ícono de pago reconoce
 * "Visa azul" o "Mastercard naranja".
 */
const SOCIAL_ICON_STYLE = {
  instagram: { background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', color: '#fff' },
  facebook: { background: '#1877f2', color: '#fff' },
};

/**
 * Enlace de Google Maps de la ubicación real (v2.9.7, pedido explícito del
 * usuario): URL específica con el `geocode` del local, no una búsqueda
 * genérica por texto de dirección — Google la genera por lugar, no se puede
 * derivar de `storeSettings.address`. Si la ubicación real cambia, este
 * enlace hay que regenerarlo a mano desde Google Maps.
 */
const GOOGLE_MAPS_URL =
  'https://www.google.com/maps?um=1&ie=UTF-8&fb=1&gl=py&sa=X&geocode=Kcn-vDqT8VeUMQNVxqu2XGOq&daddr=Trinidad+072201';

/** §7.5: glifos como SVG en línea, mismo criterio que `PublicNavbar` — sin biblioteca de íconos. */
function Icon({ name }) {
  const paths = {
    truck: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    ),
    help: (
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
    ),
    doc: <path d="M7 3h7l4 4v14H7zM14 3v4h4M9 12h6M9 16h6" />,
    shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9.5 12l2 2 3.5-4" />,
    mail: <path d="M4 5h16v14H4zM4 6l8 7 8-7" />,
    pin: <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
    card: <path d="M3 6h18v12H3zM3 10h18M7 15h4" />,
    bank: <path d="M4 10h16M6 10v8M11 10v8M13 10v8M18 10v8M4 20h16M12 3l9 5H3z" />,
    whatsapp: (
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.3A9 9 0 1 0 12 3zM8.7 8.3c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.4.2.5.7 1.6.7 1.7.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.5.5c-.1.1-.2.3-.1.5.2.4.7 1.1 1.5 1.8.9.8 1.6 1 2 1.2.2.1.3 0 .5-.1l.6-.7c.2-.2.3-.2.5-.1l1.5.7c.2.1.3.2.4.3.1.2.1.9-.2 1.4-.3.5-1.4 1-2 1-.6 0-1.5-.2-3.3-1.4-2.2-1.5-3.6-3.7-3.7-3.9-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.7.8-1.9z" />
    ),
    instagram: <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM17 6.5h.01" />,
    facebook: <path d="M14 21v-7h2.5l.5-3H14V9c0-.9.2-1.5 1.5-1.5H17V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v7z" />,
    external: <path d="M14 4h6v6M20 4l-9 9M6 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-1" />,
    clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2" />,
    code: <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />,
    chevron: <path d="M9 6l6 6-6 6" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

/**
 * Pie del catálogo (09_COMPONENTES.md §9.8 `PublicFooter`).
 *
 * **v2.9.6 — reestilado sobre referencia visual** (pedido explícito del
 * usuario): misma estructura de columnas de v2.9.2 (Marca + Soporte + Formas
 * de pago + Redes/Ubicación), con jerarquía tipográfica, iconografía en línea
 * (sin librería, mismo criterio que `PublicNavbar`), tarjetas con borde y el
 * acento azul que ya define `--color-volt-500` (`08_UI_SYSTEM.md` v2.2.0: es
 * azul desde esa versión, el nombre "volt" quedó de antes). Se suma un CTA de
 * WhatsApp de la tienda, una columna "Ubicación" con enlace a Google Maps y un
 * bloque de horario separado en la base.
 *
 * La franja de bancos con reintegros de la referencia **no se reproduce**:
 * nombra entidades y porcentajes de otro negocio, no confirmados para
 * Pablito Sports — no estaba en el pedido escrito, solo en la imagen, y
 * afirmar medios de pago o descuentos que el negocio no declaró rompe la
 * regla ya vigente de este componente ("no inventa datos comerciales").
 *
 * **No inventa datos comerciales.** No hay envíos, garantías ni medios de pago
 * confirmados por el negocio más allá de los tres que sí se declaran acá. Las
 * redes sociales, la dirección y el horario solo se muestran si existen en
 * `store_settings` o en el recurso de contenido institucional — ninguna
 * columna se dibuja vacía.
 */
export function PublicFooter({ storeSettings }) {
  const año = new Date().getFullYear();

  const nombre = storeSettings?.store_name ?? 'Pablito Sports';
  const redes = Object.entries(storeSettings?.social_links ?? {});
  const direccion = storeSettings?.address;
  const whatsappTienda = simpleWhatsAppHref(storeSettings?.whatsapp_number);
  const { data: bancos } = useBanks();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div>
            <p className={styles.brand}>
              {nombre.split(' ')[0]}
              <span className={styles.brandRest}>{nombre.split(' ').slice(1).join(' ')}</span>
            </p>
            <p className={styles.claim}>
              Calzado, indumentaria y accesorios deportivos. Consultá por WhatsApp y te asesoramos.
            </p>

            {whatsappTienda && (
              <a
                href={whatsappTienda}
                className={styles.whatsappCta}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.whatsappIcon}>
                  <Icon name="whatsapp" />
                </span>
                <span className={styles.whatsappText}>
                  <span className={styles.whatsappLabel}>Consultanos por WhatsApp</span>
                  <strong>{storeSettings.whatsapp_number}</strong>
                </span>
                <Icon name="chevron" />
              </a>
            )}
          </div>

          <nav aria-labelledby="pie-soporte">
            <p id="pie-soporte" className={styles.heading}>
              Soporte
            </p>
            <ul className={styles.iconList}>
              {SUPPORT_LINKS.map((enlace) => (
                <li key={enlace.to}>
                  <Link to={enlace.to} className={styles.iconLink}>
                    <span className={styles.iconBox}>
                      <Icon name={enlace.icon} />
                    </span>
                    {enlace.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className={styles.heading}>Formas de pago</p>
            <ul className={styles.iconList}>
              {PAYMENT_METHODS.map((metodo) => (
                <li key={metodo.label} className={styles.iconRow}>
                  <span className={styles.iconBox}>
                    <Icon name={metodo.icon} />
                  </span>
                  <span>
                    <span className={styles.itemLabel}>{metodo.label}</span>
                    <span className={styles.itemHint}>{metodo.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.lastCol}>
            {redes.length > 0 && (
              <div>
                <p className={styles.heading}>Redes sociales</p>
                <ul className={styles.cardList}>
                  {redes.map(([clave, url]) => (
                    <li key={clave}>
                      <a
                        href={url}
                        className={styles.socialCard}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span
                          className={styles.iconBox}
                          style={SOCIAL_ICON_STYLE[clave.toLowerCase()]}
                        >
                          <Icon name={SOCIAL_ICON[clave.toLowerCase()] ?? 'external'} />
                        </span>
                        <span>
                          <span className={styles.itemLabel}>{socialLabel(clave)}</span>
                          <span className={styles.itemHint}>{nombre}</span>
                        </span>
                        <Icon name="external" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {direccion && (
              <div className={redes.length > 0 ? styles.locationBlock : undefined}>
                <p className={styles.heading}>Ubicación</p>
                <div className={styles.locationCard}>
                  <span className={styles.iconBox}>
                    <Icon name="pin" />
                  </span>
                  <span>
                    <span className={styles.itemLabel}>{nombre}</span>
                    <span className={`${styles.itemHint} ${styles.preLine}`}>{direccion}</span>
                    <a
                      href={GOOGLE_MAPS_URL}
                      className={styles.mapsLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en Google Maps
                      <Icon name="external" />
                    </a>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {bancos && bancos.length > 0 && (
          <div className={styles.banks}>
            <div className={styles.banksHeading}>
              <p className={styles.banksTitle}>
                TENÉS SUPER <span className={styles.banksHighlight}>DESCUENTOS</span>
              </p>
              <p className={styles.banksSubtitle}>Abonando con tarjeta de crédito</p>
            </div>

            <ul className={styles.bankList}>
              {bancos.map((banco) => (
                <li key={banco.name} className={styles.bankCard}>
                  {banco.image_url && (
                    <img src={banco.image_url} alt={banco.name} className={styles.bankLogo} />
                  )}
                  <strong className={styles.bankPercent}>{banco.discount_percentage}%</strong>
                  <span className={styles.bankNote}>{banco.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.bottom}>
          {direccion && (
            <p className={styles.copy}>
              <Icon name="pin" /> {direccion}
              {storeSettings?.business_hours && (
                <>
                  <span className={styles.copySeparator} aria-hidden="true">
                    ·
                  </span>
                  <Icon name="clock" />
                  <span className={styles.preLine}>{storeSettings.business_hours}</span>
                </>
              )}
            </p>
          )}

        </div>

        <p className={styles.copyright}>
          © {año} {nombre}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
