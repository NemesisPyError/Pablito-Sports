import { Link } from 'react-router-dom';

import { useStoreAbout } from '../../features/store/hooks/useStoreAbout.js';
import { catalogHref, GENDER_AXES } from '../../features/store/utils/navAxes.js';
import styles from './PublicFooter.module.css';

/** Nombre presentable de una red a partir de su clave en `social_links`. */
function socialLabel(clave) {
  return clave.charAt(0).toUpperCase() + clave.slice(1);
}

/**
 * Pie del catálogo (09_COMPONENTES.md §9.8 `PublicFooter`).
 *
 * **No inventa datos comerciales.** No hay envíos, garantías ni medios de pago:
 * solo se muestra lo que existe en `store_settings` y en el recurso de contenido
 * institucional. Cada bloque se omite si su dato no está cargado.
 *
 * «Nosotros» y «Contacto» viven acá y no en la navegación superior.
 */
export function PublicFooter({ storeSettings }) {
  const { data: historia } = useStoreAbout();
  const año = new Date().getFullYear();

  const nombre = storeSettings?.store_name ?? 'Pablito Sports';
  const redes = Object.entries(storeSettings?.social_links ?? {});

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div>
            <p className={styles.brand}>{nombre}</p>
            <p className={styles.claim}>
              Calzado, indumentaria y accesorios deportivos. Consultá por WhatsApp y te asesoramos.
            </p>
          </div>

          <nav aria-labelledby="pie-explorar">
            <p id="pie-explorar" className={styles.heading}>
              Explorar
            </p>
            <ul className={styles.list}>
              {GENDER_AXES.map((eje) => (
                <li key={eje.key}>
                  <Link to={catalogHref({ gender: eje.genders })} className={styles.link}>
                    {eje.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={catalogHref({ onSale: true })} className={styles.link}>
                  Promociones
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="pie-empresa">
            <p id="pie-empresa" className={styles.heading}>
              La empresa
            </p>
            <ul className={styles.list}>
              <li>
                <Link to="/nosotros" className={styles.link}>
                  Nosotros
                </Link>
              </li>
              <li>
                <Link to="/contacto" className={styles.link}>
                  Contacto
                </Link>
              </li>
              <li>
                <Link to="/catalogo" className={styles.link}>
                  Catálogo
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className={styles.heading}>Contacto</p>

            {storeSettings?.address && (
              <p className={`${styles.data} ${styles.dataRow}`}>
                <span className={styles.dataLabel}>Ubicación</span>
                {storeSettings.address}
              </p>
            )}

            {storeSettings?.business_hours && (
              <p className={`${styles.data} ${styles.dataRow}`}>
                <span className={styles.dataLabel}>Horarios</span>
                {storeSettings.business_hours}
              </p>
            )}

            {storeSettings?.whatsapp_number && (
              <p className={`${styles.data} ${styles.dataRow}`}>
                <span className={styles.dataLabel}>WhatsApp</span>
                {storeSettings.whatsapp_number}
              </p>
            )}

            {historia?.email && (
              <p className={`${styles.data} ${styles.dataRow}`}>
                <span className={styles.dataLabel}>Correo</span>
                <a href={`mailto:${historia.email}`} className={styles.link}>
                  {historia.email}
                </a>
              </p>
            )}

            {redes.length > 0 && (
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Seguinos</span>
                <div className={styles.social}>
                  {redes.map(([clave, url]) => (
                    <a
                      key={clave}
                      href={url}
                      className={styles.socialLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {socialLabel(clave)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {año} {nombre}. Todos los derechos reservados.
          </p>
          <p className={styles.copy}>Hecho para deportistas de verdad</p>
        </div>
      </div>
    </footer>
  );
}
