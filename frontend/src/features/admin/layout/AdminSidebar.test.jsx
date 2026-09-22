import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sesion = { administrator: null };

vi.mock('../../auth/index.js', () => ({
  useAdminAuth: () => sesion,
}));

const { AdminSidebar } = await import('./AdminSidebar.jsx');

/**
 * "Configuración" vuelve al menú del panel.
 *
 * v1.6.0 le quitó la entrada de sidebar y la ruta a pedido del usuario, sin
 * borrar la pantalla —quedó reversible a propósito—. El efecto que no se
 * previó: `SettingsPage` es la ÚNICA pantalla que edita dirección, horarios,
 * WhatsApp, redes y el texto y la foto de "Nuestra historia", así que esos
 * contenidos dejaron de ser administrables. La página pública "Nosotros"
 * llegó a invitar a editarla «desde Configuración → Nuestra historia», un
 * lugar del panel que en ese momento no existía.
 *
 * Lo que fija este test es lo que se rompió sin que nadie lo notara: que el
 * camino hasta esa pantalla exista, y para el rol correcto.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor;
let raiz;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

function montarComo(rol) {
  sesion.administrator = rol ? { role: rol } : null;
  act(() =>
    raiz.render(
      <MemoryRouter>
        <AdminSidebar open={false} onNavigate={() => {}} />
      </MemoryRouter>,
    ),
  );
}

const enlaces = () =>
  [...contenedor.querySelectorAll('#adminSidebar a')].map((a) => ({
    texto: a.textContent.trim(),
    destino: a.getAttribute('href'),
  }));

const buscar = (texto) => enlaces().find((enlace) => enlace.texto === texto);

describe('el ítem de Configuración', () => {
  it('está en el menú de un administrador', () => {
    montarComo('administrator');

    expect(buscar('Configuración')).toBeDefined();
  });

  it('apunta a la ruta declarada en `AdminRoutes`', () => {
    montarComo('administrator');

    expect(buscar('Configuración').destino).toBe('/admin/settings');
  });

  it('también lo ve el superadministrador', () => {
    montarComo('super_administrator');

    expect(buscar('Configuración')).toBeDefined();
  });

  it('no es exclusivo del superadministrador, a diferencia de Usuarios', () => {
    // §8.2: el permiso es `manage_store_settings`, rol mínimo Administrador.
    montarComo('administrator');

    expect(buscar('Configuración')).toBeDefined();
    expect(buscar('Usuarios')).toBeUndefined();
  });
});

describe('el resto del menú no cambió', () => {
  it('conserva las secciones que ya estaban, en su orden', () => {
    montarComo('super_administrator');

    expect(enlaces().map((enlace) => enlace.texto)).toEqual([
      'Dashboard',
      'Productos',
      'Categorías',
      'Marcas',
      'Deportes',
      'Talles',
      'Promociones',
      'Banners',
      'Bancos',
      'Configuración',
      'Usuarios',
    ]);
  });

  it('cada ítem lleva un destino dentro del panel', () => {
    montarComo('super_administrator');

    for (const enlace of enlaces()) {
      expect(enlace.destino.startsWith('/admin/')).toBe(true);
    }
  });
});
