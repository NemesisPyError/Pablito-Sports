import { Link } from 'react-router-dom';

import { MediaTile } from '../../../shared/components/MediaTile.jsx';
import styles from './MegaMenu.module.css';

/**
 * Panel de subcategorías y marcas de un eje comercial (09_COMPONENTES.md §9.8).
 *
 * Panel de navegación, **no** diálogo: no captura el foco. Se cierra con
 * `Escape`, al salir con `Tab` o al retirar el puntero.
 *
 * No fabrica categorías ni marcas: solo compone el eje con el árbol real que
 * devuelve `GET /api/v1/categories` y el catálogo real de `GET /api/v1/brands`.
 * El eje `DEPORTES` (v2.8.0) reutiliza el mismo mecanismo de `groups` para
 * listar `GET /api/v1/sports` como enlaces planos, sin subitems ni marcas.
 */
export function MegaMenu({ axis, id, onNavigate }) {
  const brands = axis.brands ?? [];
  if (axis.groups.length === 0 && brands.length === 0) return null;

  return (
    <div className={styles.panel} id={id}>
      <div className={styles.inner}>
        <Link to={axis.href} className={styles.all} onClick={onNavigate}>
          {`Ver todo ${axis.label}`}
        </Link>

        <div className={styles.groups}>
          {axis.groups.map((group) => (
            <div key={group.slug}>
              <Link to={group.href} className={styles.groupTitle} onClick={onNavigate}>
                {group.name}
              </Link>

              {group.items.length > 0 && (
                <ul className={styles.items}>
                  {group.items.map((item) => (
                    <li key={item.slug}>
                      <Link to={item.href} className={styles.item} onClick={onNavigate}>
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {brands.length > 0 && (
            <div>
              <span className={styles.groupTitle}>Marcas</span>
              <ul className={`${styles.items} ${styles.brandItems}`}>
                {brands.map((brand) => (
                  <li key={brand.slug}>
                    <MediaTile
                      name={brand.name}
                      href={brand.href}
                      imageUrl={brand.imageUrl}
                      aspect="brand"
                      className={styles.brandTile}
                      onClick={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
