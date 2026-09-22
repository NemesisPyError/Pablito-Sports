import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pablito.store.theme';
const THEMES = ['light', 'dark'];

function leerTemaGuardado() {
  try {
    const valor = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(valor) ? valor : 'light';
  } catch {
    // Almacenamiento bloqueado (navegación privada, política del navegador):
    // la tienda sigue funcionando, solo no recuerda la preferencia.
    return 'light';
  }
}

/**
 * Preferencia de tema de la tienda pública (claro/oscuro).
 *
 * Misma forma que `useAdminTheme.js`, con clave de `localStorage` propia
 * (`pablito.store.theme`, no `pablito.admin.theme`): son dos preferencias
 * independientes que nunca deben pisarse. `PublicLayout` aplica el
 * resultado como `data-store-theme` en su contenedor raíz — no
 * `data-theme` (ese es el atributo del panel) ni `<html>`/`<body>`.
 */
export function usePublicTheme() {
  const [theme, setTheme] = useState(leerTemaGuardado);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sin almacenamiento disponible la preferencia no persiste entre
      // visitas, pero el cambio de tema en esta sesión sigue funcionando.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((actual) => (actual === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
