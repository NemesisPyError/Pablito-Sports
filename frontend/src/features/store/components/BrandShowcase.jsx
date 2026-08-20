import { Link } from 'react-router-dom';

import { catalogHref } from '../utils/navAxes.js';
import styles from './BrandShowcase.module.css';

/**
 * Cuántas piezas hacen falta para que el collage se lea como collage.
 *
 * Con una sola imagen el bloque parece una tarjeta rota, así que la marca se
 * publica igual pero sin collage: el logotipo y la frase se sostienen solos.
 */
const MIN_COLLAGE_PIECES = 2;

/**
 * Bloque de una marca destacada (09_COMPONENTES.md §9.8).
 *
 * Consume `BrandShowcaseDTO`: logotipo, frase y collage, todo administrable.
 * Una marca sin logotipo se compone con su nombre (`UDS-09`), y una sin
 * piezas suficientes se publica sin collage en lugar de no publicarse.
 */
export function BrandShowcase({ showcase }) {
  if (!showcase) return null;

  const href = catalogHref({ brand: showcase.slug });
  const piezas = showcase.images ?? [];
  const tituloId = `marca-${showcase.slug}`;

  return (
    <section className={styles.showcase} aria-labelledby={tituloId}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          {showcase.image_url ? (
            <>
              <img src={showcase.image_url} alt="" className={styles.logo} loading="lazy" />
              <h2 id={tituloId} className="visually-hidden">
                {showcase.name}
              </h2>
            </>
          ) : (
            <h2 id={tituloId} className={styles.wordmark}>
              {showcase.name}
            </h2>
          )}

          {showcase.tagline && <p className={styles.tagline}>{showcase.tagline}</p>}

          <Link to={href} className={`${styles.action} ${styles.focusRing}`}>
            <span aria-hidden="true">Ver colección</span>
            <span className="visually-hidden">{`Ver la colección de ${showcase.name}`}</span>
          </Link>
        </div>

        {piezas.length >= MIN_COLLAGE_PIECES && (
          <div className={styles.collage}>
            {piezas.map((pieza) => (
              <Link
                key={pieza.position}
                to={href}
                className={styles.focusRing}
                tabIndex={-1}
                aria-hidden="true"
              >
                {/* El collage es ilustración: su enlace queda fuera del orden
                    de tabulación porque «Ver colección» ya lleva al mismo
                    sitio, y repetir cuatro destinos idénticos solo alarga el
                    recorrido por teclado. */}
                <img
                  src={pieza.image_url}
                  alt={pieza.alt_text ?? ''}
                  className={styles.piece}
                  loading="lazy"
                  decoding="async"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
