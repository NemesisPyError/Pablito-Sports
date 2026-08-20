import { Link } from 'react-router-dom';

import { useStoreAbout } from '../hooks/useStoreAbout.js';
import styles from './StoryBlock.module.css';

const TITLE_ID = 'portada-historia';

/** Enlace de consulta directa, con el número tal como lo guardó el panel. */
function whatsappHref(numero) {
  const digitos = String(numero ?? '').replace(/\D/g, '');
  return digitos ? `https://wa.me/${digitos}` : null;
}

/**
 * Sección «Nuestra historia» (05_API.md §7.2b).
 *
 * Todo el contenido es administrable. **Sin título no se publica**: un bloque
 * institucional sin encabezado no se entiende, y `about_text` sin `about_title`
 * es un estado que el panel ya avisa al guardar.
 *
 * La foto es opcional: sin ella la sección se compone a una columna, que sigue
 * siendo una presentación válida y no un hueco (`UDS-09`).
 */
export function StoryBlock({ storeSettings }) {
  const { data: historia } = useStoreAbout();

  if (!historia?.about_title) return null;

  const whatsapp = whatsappHref(storeSettings?.whatsapp_number);

  return (
    <section className={styles.story} aria-labelledby={TITLE_ID}>
      <div className={styles.inner}>
        {historia.about_image_url && (
          <div className={styles.media}>
            <img
              src={historia.about_image_url}
              alt=""
              className={styles.image}
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div>
          <span className={styles.eyebrow}>Nuestra historia</span>

          <h2 id={TITLE_ID} className={styles.title}>
            {historia.about_title}
          </h2>

          {historia.about_text && <p className={styles.text}>{historia.about_text}</p>}

          <div className={styles.actions}>
            <Link to="/nosotros" className={`${styles.action} ${styles.actionPrimary}`}>
              Conocer más
            </Link>

            {whatsapp && (
              <a
                href={whatsapp}
                className={`${styles.action} ${styles.actionWhatsApp}`}
                target="_blank"
                rel="noreferrer"
              >
                Escribir por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
