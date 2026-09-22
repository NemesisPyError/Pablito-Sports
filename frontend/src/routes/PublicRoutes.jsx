import { Route, Routes } from 'react-router-dom';

import { RouteErrorBoundary } from '../app/RouteErrorBoundary.jsx';
import { CartPage } from '../features/cart/index.js';
import { CatalogPage } from '../features/catalog/index.js';
import {
  AboutPage,
  ContactPage,
  HomePage,
  LegalPage,
  NotFoundPage,
} from '../features/store/index.js';
import { ProductDetailPage } from '../features/products/index.js';
import { PublicLayout } from '../shared/layouts/PublicLayout.jsx';

/**
 * Rutas públicas del catálogo.
 *
 * 06_FRONTEND.md §8.1:
 * - `/` Home
 * - `/catalogo` Catálogo
 * - `/producto/:slug` Detalle
 * - `/carrito` Carrito
 * - `/nosotros` Información
 * - `/contacto` Contacto
 * - `/politica-envios`, `/preguntas-frecuentes`, `/terminos`,
 *   `/politica-privacidad`: enlaces "Soporte" del pie, con los textos legales
 *   aprobados por el cliente el 11/09/2026 — ver `LegalPage`.
 */
export function PublicRoutes({ storeSettings }) {
  return (
    <Routes>
      <Route element={<PublicLayout storeSettings={storeSettings} />}>
        <Route path="/" element={<HomePage storeSettings={storeSettings} />} />
        <Route path="/catalogo" element={<CatalogPage storeSettings={storeSettings} />} />
        <Route
          path="/producto/:slug"
          element={
            <RouteErrorBoundary
              title="No pudimos mostrar el producto"
              homeTo="/catalogo"
              homeLabel="Ir al catálogo"
            >
              <ProductDetailPage storeSettings={storeSettings} />
            </RouteErrorBoundary>
          }
        />
        <Route
          path="/carrito"
          element={
            <RouteErrorBoundary
              title="No pudimos mostrar el carrito"
              homeTo="/catalogo"
              homeLabel="Ir al catálogo"
            >
              <CartPage storeSettings={storeSettings} />
            </RouteErrorBoundary>
          }
        />
        <Route path="/nosotros" element={<AboutPage storeSettings={storeSettings} />} />
        <Route path="/contacto" element={<ContactPage storeSettings={storeSettings} />} />
        <Route
          path="/politica-envios"
          element={<LegalPage pagina="envios" storeSettings={storeSettings} />}
        />
        <Route
          path="/preguntas-frecuentes"
          element={<LegalPage pagina="preguntas" storeSettings={storeSettings} />}
        />
        <Route
          path="/terminos"
          element={<LegalPage pagina="terminos" storeSettings={storeSettings} />}
        />
        <Route
          path="/politica-privacidad"
          element={<LegalPage pagina="privacidad" storeSettings={storeSettings} />}
        />
        {/* §8.1: una ruta inexistente muestra la 404, no redirige en silencio.
            El HTTP sigue siendo 200 (SPA sin SSR); lo que cambia es que el
            usuario ve una pantalla clara, no aparece en otro lado. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
