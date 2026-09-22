import { Outlet } from 'react-router-dom';

import { BrandStrip } from '../../features/store/components/BrandStrip.jsx';
import { PublicNavbar } from '../../features/store/components/PublicNavbar.jsx';
import { ScrollToTop } from '../components/ScrollToTop.jsx';
import { PublicFooter } from './PublicFooter.jsx';
import { usePublicTheme } from './usePublicTheme.js';

/**
 * Layout público con navegación, acceso al carrito y footer.
 *
 * `data-store-theme` vive acá, no en `<html>`/`<body>`: es el único
 * contenedor que envuelve toda ruta pública (Home, catálogo, ficha,
 * carrito), así que un cambio de tema no salta al navegar entre ellas, y el
 * panel admin —que nunca renderiza este layout— no puede heredarlo.
 */
export function PublicLayout({ storeSettings }) {
  const { theme, toggleTheme } = usePublicTheme();

  return (
    <div className="min-vh-100 d-flex flex-column" data-store-theme={theme}>
      {/* Vive en el layout, que no se desmonta al cambiar de ruta. */}
      <ScrollToTop />
      <PublicNavbar storeSettings={storeSettings} theme={theme} onToggleTheme={toggleTheme} />
      <BrandStrip />

      {/* §10.6: destino del enlace «Saltar al contenido». */}
      <main id="contenido" className="flex-grow-1">
        <Outlet />
      </main>

      <PublicFooter storeSettings={storeSettings} />
    </div>
  );
}
