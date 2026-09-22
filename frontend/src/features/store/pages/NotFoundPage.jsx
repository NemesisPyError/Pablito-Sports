import { Link } from 'react-router-dom';

import { Page } from '../../../shared/components/Page.jsx';

/**
 * Página 404 pública (06_FRONTEND.md §8.1).
 *
 * Reemplaza al redirect silencioso al Home: una ruta inexistente ahora se
 * **comunica**, con navegación de vuelta al catálogo. Se renderiza dentro de
 * `PublicLayout`, así que conserva navbar y footer.
 *
 * El HTTP sigue siendo `200`: una SPA sin SSR no puede devolver un `404` real
 * para una ruta arbitraria del cliente, y **no se falsean cabeceras desde
 * React**. Lo que cambia es que el usuario ve una pantalla clara en lugar de
 * aparecer en otro lado sin explicación.
 */
export function NotFoundPage() {
  return (
    <Page
      eyebrow="Error 404"
      title="No encontramos esta página"
      breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Página no encontrada' }]}
      lead="La dirección que abriste no existe o el contenido se movió. Probá desde el inicio o mirá todo el catálogo."
      narrow
    >
      <div className="d-flex flex-wrap gap-2">
        <Link to="/" className="btn btn-primary">
          Ir al inicio
        </Link>
        <Link to="/catalogo" className="btn btn-outline-secondary">
          Ver el catálogo
        </Link>
      </div>
    </Page>
  );
}
