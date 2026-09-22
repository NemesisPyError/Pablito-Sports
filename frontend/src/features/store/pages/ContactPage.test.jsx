import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactPage } from './ContactPage.jsx';

/**
 * `ContactPage` arma su propio link de WhatsApp además del que ya usa
 * `PublicFooter`/`StoryBlock` (vía `simpleWhatsAppHref`) — esta prueba fija
 * que use el mismo saneador, para que un número con espacios/guiones no
 * produzca un `wa.me` roto (RN-58).
 */

vi.mock('../hooks/useStoreAbout.js', () => ({
  useStoreAbout: () => ({ data: {} }),
}));

let contenedor;
let raiz;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

function montar(settings) {
  act(() => {
    raiz.render(
      <MemoryRouter>
        <ContactPage storeSettings={settings} />
      </MemoryRouter>,
    );
  });
}

describe('ContactPage — link de WhatsApp', () => {
  it('usa el formato internacional sin espacios, aunque el dato tenga espacios', () => {
    montar({ whatsapp_number: '+595 986 742700' });

    const enlace = contenedor.querySelector('a[href^="https://wa.me/"]');
    expect(enlace.getAttribute('href')).toBe('https://wa.me/595986742700');
  });

  it('quita guiones y otros caracteres no numéricos', () => {
    montar({ whatsapp_number: '+595-986-742-700' });

    const enlace = contenedor.querySelector('a[href^="https://wa.me/"]');
    expect(enlace.getAttribute('href')).toBe('https://wa.me/595986742700');
  });

  it('no muestra el bloque de WhatsApp si no hay número configurado', () => {
    montar({});

    expect(contenedor.querySelector('a[href^="https://wa.me/"]')).toBeNull();
  });
});
