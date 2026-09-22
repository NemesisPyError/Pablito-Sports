import { Link } from 'react-router-dom';

import { Image } from '../../../shared/components/Image.jsx';
import { simpleWhatsAppHref } from '../../../shared/utils/whatsapp.js';
import { useStoreAbout } from '../hooks/useStoreAbout.js';
import styles from './StoryBlock.module.css';

const TITLE_ID = 'portada-historia';

/**
 * Sección «Nuestra historia» (05_API.md §7.2b).
 *
 * Todo el contenido es administrable. **Sin título no se publica**: un bloque
 * institucional sin encabezado no se entiende, y `about_text` sin `about_title`
 * es un estado que el panel ya avisa al guardar.
 *
 * La foto es opcional: sin ella la sección se compone a una columna, que sigue
 * siendo una presentación válida y no un hueco (`UDS-09`).
 *
 * La foto se muestra con el componente compartido `Image` (`<picture>` + srcset
 * WebP/JPEG del pipeline del namespace `store`, §17.1.2) y `object-fit: contain`
 * a proporción 4:3: se ve **completa**, sin recorte destructivo ni deformación.
 */
export function StoryBlock({ storeSettings }) {
  const { data: historia } = useStoreAbout();

  if (!historia?.about_title) return null;

  const whatsapp = simpleWhatsAppHref(storeSettings?.whatsapp_number);

  return (
    <section className={styles.story} aria-labelledby={TITLE_ID}>
      <div className={styles.inner}>
        {historia.about_image_url && (
          <Image
            src={historia.about_image_url}
            alt=""
            aspectRatio="4 / 3"
            objectFit="contain"
            sizes="(min-width: 992px) 46vw, 100vw"
          />
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
