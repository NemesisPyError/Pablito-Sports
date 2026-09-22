import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El script de Cloudflare se inyecta una sola vez, aunque `loadTurnstileScript`
 * se llame varias veces (remonte del gate, StrictMode). Cada test reimporta el
 * módulo (`vi.resetModules`): guarda la promesa en curso en una variable de
 * módulo, y sin resetear un test vería el estado que dejó el anterior.
 */

beforeEach(() => {
  vi.resetModules();
  delete window.turnstile;
  document.querySelectorAll('script').forEach((script) => script.remove());
});

afterEach(() => {
  delete window.turnstile;
  document.querySelectorAll('script').forEach((script) => script.remove());
});

describe('loadTurnstileScript', () => {
  it('agrega un único <script> aunque se llame dos veces seguidas', async () => {
    const { loadTurnstileScript } = await import('./loadTurnstileScript.js');

    loadTurnstileScript();
    loadTurnstileScript();

    const scripts = [...document.querySelectorAll('script')].filter((script) =>
      script.src.includes('challenges.cloudflare.com'),
    );
    expect(scripts).toHaveLength(1);
  });

  it('resuelve con `window.turnstile` cuando el script ya está cargado', async () => {
    const { loadTurnstileScript } = await import('./loadTurnstileScript.js');
    window.turnstile = { render: vi.fn() };

    const resultado = await loadTurnstileScript();

    expect(resultado).toBe(window.turnstile);
  });

  it('resuelve cuando el script dispara `load`', async () => {
    const { loadTurnstileScript } = await import('./loadTurnstileScript.js');
    const promesa = loadTurnstileScript();
    const script = document.querySelector('script[src*="challenges.cloudflare.com"]');
    window.turnstile = { render: vi.fn() };

    script.dispatchEvent(new Event('load'));

    await expect(promesa).resolves.toBe(window.turnstile);
  });

  it('rechaza cuando el script no puede cargarse', async () => {
    const { loadTurnstileScript } = await import('./loadTurnstileScript.js');
    const promesa = loadTurnstileScript();
    const script = document.querySelector('script[src*="challenges.cloudflare.com"]');

    script.dispatchEvent(new Event('error'));

    await expect(promesa).rejects.toThrow();
  });
});
