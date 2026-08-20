import { Navigate, Route, Routes } from 'react-router-dom';

import { CartPage } from '../features/cart/index.js';
import { CatalogPage } from '../features/catalog/index.js';
import { AboutPage, ContactPage, HomePage } from '../features/store/index.js';
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
 */
export function PublicRoutes({ storeSettings }) {
  return (
    <Routes>
      <Route element={<PublicLayout storeSettings={storeSettings} />}>
        <Route path="/" element={<HomePage storeSettings={storeSettings} />} />
        <Route path="/catalogo" element={<CatalogPage storeSettings={storeSettings} />} />
        <Route
          path="/producto/:slug"
          element={<ProductDetailPage storeSettings={storeSettings} />}
        />
        <Route path="/carrito" element={<CartPage storeSettings={storeSettings} />} />
        <Route path="/nosotros" element={<AboutPage storeSettings={storeSettings} />} />
        <Route path="/contacto" element={<ContactPage storeSettings={storeSettings} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
