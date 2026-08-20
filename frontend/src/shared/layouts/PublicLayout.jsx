import { Outlet } from 'react-router-dom';

import { BrandStrip } from '../../features/store/components/BrandStrip.jsx';
import { PublicNavbar } from '../../features/store/components/PublicNavbar.jsx';
import { PublicFooter } from './PublicFooter.jsx';

/**
 * Layout público con navegación, acceso al carrito y footer.
 */
export function PublicLayout({ storeSettings }) {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <PublicNavbar storeSettings={storeSettings} />
      <BrandStrip />

      {/* §10.6: destino del enlace «Saltar al contenido». */}
      <main id="contenido" className="flex-grow-1">
        <Outlet />
      </main>

      <PublicFooter storeSettings={storeSettings} />
    </div>
  );
}
