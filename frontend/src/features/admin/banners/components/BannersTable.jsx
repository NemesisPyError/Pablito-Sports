import { Link } from 'react-router-dom';

import { formatDateTime } from '../../../../shared/formatters/date.js';
import { describeBannerStatus } from '../utils/bannerStatus.js';

/**
 * Listado de banners (07_PANEL_ADMIN.md §14.6).
 *
 * Tabla en escritorio y tarjetas en móvil, igual que Promociones: una tabla de
 * seis columnas con miniatura no entra en un teléfono sin desplazamiento
 * lateral.
 *
 * La miniatura usa un `<img>` liso y no el componente `Image` compartido: ese
 * deduce los anchos del espacio de productos (400/800/1600), y el de banners
 * tiene otros (800/1600/2400, `AI-06` §17.1.2). El `image_url` del DTO ya es el
 * derivado canónico, que es lo que se sirve.
 */
export function BannersTable({ banners, onDelete, busyId }) {
  return (
    <>
      {/* Escritorio */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '9rem' }}>
                Imagen
              </th>
              <th scope="col">Banner</th>
              <th scope="col" className="text-end">
                Posición
              </th>
              <th scope="col">Vigencia</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => (
              <tr key={banner.id}>
                <td>
                  <Miniatura banner={banner} />
                </td>
                <td>
                  <Link to={`/admin/banners/${banner.id}`} className="fw-semibold">
                    {banner.title}
                  </Link>
                  {banner.subtitle && (
                    <span className="d-block small text-muted text-truncate">
                      {banner.subtitle}
                    </span>
                  )}
                  {banner.link_url && (
                    <span className="d-block small text-muted text-truncate">
                      → {banner.link_url}
                    </span>
                  )}
                </td>
                <td className="text-end fw-semibold">{banner.position}</td>
                <td className="small">
                  <Vigencia banner={banner} />
                </td>
                <td>
                  <EstadoBadge banner={banner} />
                </td>
                <td className="text-end">
                  <Acciones banner={banner} busy={busyId === banner.id} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tablet */}
      <ul className="list-group d-lg-none">
        {banners.map((banner) => (
          <li key={banner.id} className="list-group-item">
            <Miniatura banner={banner} className="mb-2" />
            <div className="d-flex justify-content-between align-items-start gap-2">
              <Link to={`/admin/banners/${banner.id}`} className="fw-semibold">
                {banner.title}
              </Link>
              <span className="badge text-bg-light border text-nowrap">
                Posición {banner.position}
              </span>
            </div>
            {banner.subtitle && <p className="small text-muted mb-1">{banner.subtitle}</p>}
            <p className="small text-muted mb-2">
              <Vigencia banner={banner} />
            </p>
            <div className="d-flex align-items-center justify-content-between gap-2">
              <EstadoBadge banner={banner} />
              <Acciones banner={banner} busy={busyId === banner.id} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * `ratio-1x1` (v2.9.5, pedido explícito del usuario) solo reserva un marco
 * cuadrado de tamaño consistente para la tabla — neutro a propósito, para no
 * favorecer visualmente ninguna proporción. `object-fit-contain` muestra la
 * imagen completa dentro, nunca la recorta: hasta v2.9.3 el marco era
 * `ratio-21x9` con `object-fit-cover`, que además de recortar imponía una
 * forma panorámica al contenedor mismo — un banner vertical o cuadrado se
 * veía "aplastado" en una caja ancha aunque el recorte de datos ya no
 * forzara 21:9. El administrador tiene que poder reconocer la imagen real
 * —vertical, cuadrada o panorámica— tal como se subió.
 */
function Miniatura({ banner, className = '' }) {
  if (!banner.image_url) {
    return (
      // `d-flex` va en el hijo: `.ratio` posiciona su primer hijo en absoluto,
      // y aplicarlo al contenedor dejaría el centrado a merced del pseudo
      // elemento que le da la altura.
      <div className={`ratio ratio-1x1 bg-light rounded ${className}`}>
        <div className="d-flex align-items-center justify-content-center text-muted">
          <span className="small">Sin imagen</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ratio ratio-1x1 bg-light rounded overflow-hidden ${className}`}>
      <img
        src={banner.image_url}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-100 h-100 object-fit-contain"
      />
    </div>
  );
}

/** `RN-74`: sin fechas, el banner es permanente mientras esté activo. */
function Vigencia({ banner }) {
  if (!banner.starts_at && !banner.ends_at) return 'Permanente';

  const desde = banner.starts_at ? formatDateTime(banner.starts_at) : 'sin inicio';
  const hasta = banner.ends_at ? formatDateTime(banner.ends_at) : 'sin fin';
  return `${desde} → ${hasta}`;
}

function EstadoBadge({ banner }) {
  const estado = describeBannerStatus(banner);
  return <span className={`badge text-bg-${estado.tone}`}>{estado.label}</span>;
}

function Acciones({ banner, busy, onDelete }) {
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={`Acciones de ${banner.title}`}>
      <Link to={`/admin/banners/${banner.id}`} className="btn btn-outline-secondary">
        Editar
      </Link>
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={() => onDelete(banner)}
        disabled={busy}
      >
        Eliminar
      </button>
    </div>
  );
}
