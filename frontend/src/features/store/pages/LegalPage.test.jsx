import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildLegalData, LEGAL_ENTITY, LEGAL_PAGES } from '../legal/legalContent.js';
import { LegalPage } from './LegalPage.jsx';

/**
 * Páginas legales del pie.
 *
 * Lo que importa fijar no es el texto —está aprobado y vive en
 * `legalContent.js`—, sino que nunca se publique un dato a medio completar ni
 * uno desactualizado respecto del panel.
 *
 * `createRoot` + `act`, como el resto del proyecto: no hay
 * `@testing-library/react`.
 */

// La historia de la tienda trae el correo; se simula para no depender de red.
vi.mock('../hooks/useStoreAbout.js', () => ({
  useStoreAbout: () => ({ data: { email: 'ventas@pablito.test' } }),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SETTINGS = {
  store_name: 'Pablito Sports',
  whatsapp_number: '+595985800200',
  address: 'Trinidad, Itapúa - Paraguay',
  business_hours: 'Lunes a sábado: 08:00 - 18:30',
  social_links: { instagram: 'https://www.instagram.com/pablito_sports_' },
};

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

function montar(pagina, settings = SETTINGS) {
  const cliente = new QueryClient();
  act(() =>
    raiz.render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter>
          <LegalPage pagina={pagina} storeSettings={settings} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
}

describe('LegalPage', () => {
  it.each(Object.entries(LEGAL_PAGES))('la página «%s» muestra su título como h1', (clave, pagina) => {
    montar(clave);

    expect(contenedor.querySelector('h1')?.textContent).toBe(pagina.title);
  });

  it.each(Object.keys(LEGAL_PAGES))('«%s» no publica ningún marcador sin completar', (clave) => {
    montar(clave);

    expect(contenedor.textContent).not.toMatch(/\[Completar|completar:|undefined|null/i);
  });

  it('toma el WhatsApp y la dirección de la configuración de la tienda', () => {
    montar('terminos', { ...SETTINGS, whatsapp_number: '+595999000111' });

    expect(contenedor.textContent).toContain('+595999000111');
    expect(contenedor.textContent).toContain('Trinidad, Itapúa - Paraguay');
  });

  it('muestra el correo que llega con la historia de la tienda', () => {
    montar('terminos');

    expect(contenedor.textContent).toContain('ventas@pablito.test');
  });

  it('identifica al titular con razón social y RUC', () => {
    montar('terminos');

    const filas = Object.fromEntries(
      [...contenedor.querySelectorAll('dl > div')].map((fila) => [
        fila.querySelector('dt').textContent,
        fila.querySelector('dd').textContent,
      ]),
    );
    expect(filas['Razón social']).toBe('Pablito Sports');
    expect(filas.RUC).toBe('4357800-4');
  });

  it('cae al correo del titular si la historia de la tienda no trae uno', () => {
    expect(buildLegalData(SETTINGS, { email: null }).email).toBe(LEGAL_ENTITY.email);
    expect(buildLegalData(SETTINGS, { email: 'otro@pablito.test' }).email).toBe('otro@pablito.test');
  });

  it('omite la fila de un dato que falta en lugar de dejarla vacía', () => {
    montar('terminos', { ...SETTINGS, address: null });

    const claves = [...contenedor.querySelectorAll('dt')].map((dt) => dt.textContent);
    expect(claves).not.toContain('Domicilio comercial');
    expect(claves).toContain('WhatsApp');
  });

  it('los enlaces a redes abren fuera del sitio sin exponer la ventana de origen', () => {
    montar('terminos');

    const instagram = [...contenedor.querySelectorAll('a')].find((a) =>
      a.href.includes('instagram.com'),
    );
    expect(instagram?.getAttribute('target')).toBe('_blank');
    expect(instagram?.getAttribute('rel')).toContain('noopener');
  });

  it('no publica los anexos internos del documento', () => {
    for (const clave of Object.keys(LEGAL_PAGES)) {
      montar(clave);
      expect(contenedor.textContent).not.toMatch(/Anexo|borrador de trabajo|dictamen/i);
    }
  });

  it('una clave desconocida no rompe: no dibuja nada', () => {
    montar('inexistente');

    expect(contenedor.textContent).toBe('');
  });
});

describe('buildLegalData', () => {
  it('sin configuración cae al nombre de la tienda y deja en null lo que no tiene respaldo', () => {
    const datos = buildLegalData(undefined, undefined);

    expect(datos.tienda).toBe('Pablito Sports');
    expect(datos.whatsapp).toBeNull();
    expect(datos.direccion).toBeNull();
    expect(datos.email).toBe(LEGAL_ENTITY.email);
  });

  it('razón social y RUC salen del único lugar a completar', () => {
    const datos = buildLegalData(SETTINGS, null);

    expect(datos.razonSocial).toBe(LEGAL_ENTITY.razonSocial);
    expect(datos.ruc).toBe(LEGAL_ENTITY.ruc);
  });
});
