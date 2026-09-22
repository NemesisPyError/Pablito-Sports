import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El tema oscuro de la tienda se aplica sobre la raíz de `PublicLayout`
 * (`data-store-theme`), nunca en `<html>`/`<body>`: es la garantía de que el
 * panel admin —que no renderiza este layout— no hereda nada de acá, y de que
 * el tema no salta al cambiar de ruta pública (navbar y footer viven en el
 * layout, no se remontan). Ver `usePublicTheme.js` y el bloque
 * `[data-store-theme='dark']` de `tokens.css`.
 *
 * `PublicNavbar` y `BrandStrip` arrastran el carrito y consultas de
 * catálogo/marcas — se mockean para aislar lo que se prueba acá: el cableado
 * del tema, no esos componentes (mismo criterio que ya documenta
 * `SearchForm.test.jsx` para no montar `PublicNavbar` entero).
 */

vi.mock('../../features/store/components/PublicNavbar.jsx', () => ({
  PublicNavbar: ({ theme, onToggleTheme }) => (
    <button type="button" data-testid="stub-toggle" onClick={onToggleTheme}>
      {theme}
    </button>
  ),
}));

vi.mock('../../features/store/components/BrandStrip.jsx', () => ({
  BrandStrip: () => null,
}));

// `PublicFooter` consulta `useBanks` (Superdescuentos): se mockea para que
// esta batería, que prueba el tema, no dependa de una petición de red real.
vi.mock('../../features/store/hooks/useBanks.js', () => ({
  useBanks: () => ({ data: [] }),
}));

const { PublicLayout } = await import('./PublicLayout.jsx');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'pablito.store.theme';

let contenedor;
let root;

beforeEach(() => {
  window.localStorage.clear();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PublicLayout storeSettings={null} />}>
              <Route path="/" element={<p>Contenido</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

const raiz = () => contenedor.querySelector('[data-store-theme]');
const botonToggle = () => contenedor.querySelector('[data-testid="stub-toggle"]');

describe('PublicLayout — tema de la tienda', () => {
  it('arranca en claro y no en ningún otro elemento (html/body)', () => {
    montar();

    expect(raiz().getAttribute('data-store-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-store-theme')).toBeNull();
    expect(document.body.getAttribute('data-store-theme')).toBeNull();
  });

  it('el toggle de la navbar cambia `data-store-theme` sin recargar', () => {
    montar();

    act(() => botonToggle().click());

    expect(raiz().getAttribute('data-store-theme')).toBe('dark');
  });

  it('la preferencia persiste en localStorage con su propia clave', () => {
    montar();

    act(() => botonToggle().click());

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    // Clave distinta a la del panel: nunca deben pisarse.
    expect(window.localStorage.getItem('pablito.admin.theme')).toBeNull();
  });

  it('una preferencia oscura guardada se aplica al volver a entrar', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    montar();

    expect(raiz().getAttribute('data-store-theme')).toBe('dark');
  });

  it('el contenido de la ruta activa se sigue mostrando', () => {
    montar();

    expect(contenedor.textContent).toContain('Contenido');
  });
});
