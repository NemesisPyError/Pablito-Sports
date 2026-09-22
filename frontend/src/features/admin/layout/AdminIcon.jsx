/**
 * Glifos del panel administrativo, como SVG en línea (08_UI_SYSTEM.md §8:
 * "sin biblioteca de íconos" — mismo criterio que `PublicNavbar`/
 * `PublicFooter` en el catálogo público, ahora también en el panel).
 *
 * v2.9.11 (pedido explícito del usuario, rediseño visual del panel):
 * reemplaza los glifos Unicode que tenía la sidebar (▦▤▧◈⚽◫％▬) y el texto
 * "☰" del topbar — livianos, consistentes entre sí, sin agregar ninguna
 * dependencia. Un solo lugar para los íconos del panel: la sidebar, el
 * topbar, las tarjetas del dashboard y los estados vacíos del dashboard lo
 * comparten, en vez de repetir el mismo mapa de `path` en cada archivo.
 */
const PATHS = {
  // Navegación (sidebar)
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  products: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  categories: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  brands:
    'M20.6 12.3L12.7 4.4a2 2 0 0 0-1.4-.6H5a1 1 0 0 0-1 1v6.3a2 2 0 0 0 .6 1.4l7.9 7.9a2 2 0 0 0 2.8 0l5.3-5.3a2 2 0 0 0 0-2.8zM7.5 7.5h.01',
  sports: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v4l3 2-1 4h-4l-1-4 3-2z',
  sizes: 'M4 8h16v8H4zM4 8v3M8 8v2M12 8v3M16 8v2M20 8v3',
  promotions: 'M5 19L19 5M7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  banners: 'M3 5h18v14H3zM3 15l5-5 4 4 4-4 5 5M9 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  banks: 'M3 10l9-6 9 6M4 10v9h16v-9M9 19v-6h6v6M4 19h16',
  users:
    'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 19v-2a4 4 0 0 0-3-3.87M16 1.13a4 4 0 0 1 0 7.75',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  // Chrome del panel (topbar)
  menu: 'M4 7h16M4 12h16M4 17h16',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  logout: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9',
  // Tarjetas de métricas (dashboard)
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  eyeOff:
    'M3 3l18 18M10.6 5.1a10.6 10.6 0 0 1 1.4-.1c5 0 9 4.5 10 7a12.6 12.6 0 0 1-2.6 3.9M6.5 6.6C4 8.3 2.4 10.7 2 12c.8 2.3 3.7 6 10 6 1.3 0 2.5-.2 3.5-.5M9.9 9.9a3 3 0 0 0 4.2 4.2',
  tag: 'M20.6 12.3L12.7 4.4a2 2 0 0 0-1.4-.6H5a1 1 0 0 0-1 1v6.3a2 2 0 0 0 .6 1.4l7.9 7.9a2 2 0 0 0 2.8 0l5.3-5.3a2 2 0 0 0 0-2.8zM7.5 7.5h.01',
  cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20.5 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  alertTriangle: 'M12 4L2.5 20h19zM12 10v4M12 17h.01',
  boxOff:
    'M3 3l18 18M21 8l-4.2-2.3M14.5 4.7L12 3l-9 5v8a2 2 0 0 0 .6 1.4L5 19M8 21a2 2 0 0 1-2-2v-8M12 13v8M21 8v8a2 2 0 0 1-2 2h-3',
  // Estados vacíos del dashboard
  clipboardCheck:
    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 14l2 2 4-4',
  trendingUp: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  // Selector de tema (topbar)
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M20.5 14.5a8.5 8.5 0 1 1-9-11 7 7 0 0 0 9 11z',
};

export function AdminIcon({ name, size = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
