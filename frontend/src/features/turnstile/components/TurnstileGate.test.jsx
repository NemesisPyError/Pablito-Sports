import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { turnstileService } from '../services/turnstileService.js';
import { loadTurnstileScript } from '../utils/loadTurnstileScript.js';
import { TurnstileGate } from './TurnstileGate.jsx';

/**
 * Gate de Cloudflare Turnstile.
 *
 * `turnstileService` y `loadTurnstileScript` se mockean — igual que
 * `ProductCard.quickBuy.test.jsx` mockea `productsService` — para no
 * depender de la red real ni del script de Cloudflare: lo que se fija acá es
 * el contrato del gate (cuándo deja pasar, cuándo pide el widget, cómo
 * reacciona a un token rechazado), no si Cloudflare responde.
 */
vi.mock('../services/turnstileService.js', () => ({
  turnstileService: { getStatus: vi.fn(), verify: vi.fn() },
}));

vi.mock('../utils/loadTurnstileScript.js', () => ({
  loadTurnstileScript: vi.fn(),
}));

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  // `TurnstileChallenge` la lee en cada render (no como constante de
  // módulo), así que alcanza con fijarla acá — sin esto se autodesactiva
  // ("configuración a medias") y nunca llega a llamar a `loadTurnstileScript`.
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key');
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  turnstileService.getStatus.mockReset();
  turnstileService.verify.mockReset();
  loadTurnstileScript.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
  vi.unstubAllEnvs();
});

/** Deja correr las tareas pendientes hasta que React Query resuelve el fetch. */
async function esperar() {
  for (let intento = 0; intento < 20; intento += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <TurnstileGate>
          <p data-testid="contenido-tienda">Tienda</p>
        </TurnstileGate>
      </QueryClientProvider>,
    );
  });
  await esperar();
}

const contenidoVisible = () => contenedor.querySelector('[data-testid="contenido-tienda"]') != null;

describe('TurnstileGate — desactivado (desarrollo sin credenciales)', () => {
  it('deja pasar directo cuando el backend dice que no hace falta', async () => {
    turnstileService.getStatus.mockResolvedValue({ required: false, verified: true });

    await montar();

    expect(contenidoVisible()).toBe(true);
    expect(loadTurnstileScript).not.toHaveBeenCalled();
  });
});

describe('TurnstileGate — ya verificado (cookie vigente)', () => {
  it('deja pasar directo sin mostrar el widget', async () => {
    turnstileService.getStatus.mockResolvedValue({ required: true, verified: true });

    await montar();

    expect(contenidoVisible()).toBe(true);
    expect(loadTurnstileScript).not.toHaveBeenCalled();
  });
});

describe('TurnstileGate — hace falta verificar', () => {
  function turnstileFalso() {
    let opciones = null;
    const widget = {
      render: vi.fn((_el, opts) => {
        opciones = opts;
        return 'widget-1';
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    };
    return { widget, opciones: () => opciones };
  }

  it('no muestra el contenido de la tienda mientras no se verificó', async () => {
    turnstileService.getStatus.mockResolvedValue({ required: true, verified: false });
    loadTurnstileScript.mockResolvedValue(turnstileFalso().widget);

    await montar();

    expect(contenidoVisible()).toBe(false);
    expect(contenedor.textContent).toContain('Verificación de seguridad');
  });

  it('un token válido deja pasar a la tienda', async () => {
    turnstileService.getStatus.mockResolvedValue({ required: true, verified: false });
    const { widget, opciones } = turnstileFalso();
    loadTurnstileScript.mockResolvedValue(widget);
    turnstileService.verify.mockResolvedValue({ verified: true });

    await montar();
    expect(widget.render).toHaveBeenCalled();

    await act(async () => {
      opciones().callback('token-de-cloudflare');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(turnstileService.verify).toHaveBeenCalledWith('token-de-cloudflare');
    expect(contenidoVisible()).toBe(true);
  });

  it('un token que el backend rechaza muestra el error y no deja pasar', async () => {
    turnstileService.getStatus.mockResolvedValue({ required: true, verified: false });
    const { widget, opciones } = turnstileFalso();
    loadTurnstileScript.mockResolvedValue(widget);
    turnstileService.verify.mockRejectedValue(new Error('token inválido'));

    await montar();

    await act(async () => {
      opciones().callback('token-invalido');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(contenidoVisible()).toBe(false);
    expect(contenedor.textContent).toContain('No pudimos confirmar la verificación');
    // Un reintento necesita un token nuevo: el widget se reinicia solo.
    expect(widget.reset).toHaveBeenCalledWith('widget-1');
  });

  it('el vencimiento del widget se anuncia con un mensaje claro', async () => {
    turnstileService.getStatus.mockResolvedValue({ required: true, verified: false });
    const { widget, opciones } = turnstileFalso();
    loadTurnstileScript.mockResolvedValue(widget);

    await montar();

    await act(async () => {
      opciones()['expired-callback']();
    });

    expect(contenedor.textContent).toContain('La verificación expiró');
  });
});

describe('TurnstileGate — configuración a medias (site key ausente)', () => {
  it('avisa en vez de intentar dibujar un widget sin clave', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    turnstileService.getStatus.mockResolvedValue({ required: true, verified: false });

    await montar();

    expect(loadTurnstileScript).not.toHaveBeenCalled();
    expect(contenedor.textContent).toContain('La verificación no está disponible');
    expect(contenidoVisible()).toBe(false);
  });
});

describe('TurnstileGate — falla la consulta de estado', () => {
  it('ofrece reintentar en vez de dejar pasar en silencio', async () => {
    turnstileService.getStatus.mockRejectedValue(new Error('sin red'));

    await montar();

    expect(contenidoVisible()).toBe(false);
    expect(contenedor.textContent).toContain('No pudimos verificar el acceso');
  });
});
