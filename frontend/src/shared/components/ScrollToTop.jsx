import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Cada página nueva empieza arriba.
 *
 * React Router no toca el scroll: al cambiar de ruta sustituye el árbol de
 * componentes y el navegador conserva el desplazamiento que había. Con páginas
 * largas eso se nota como un fallo — mirar el final de una ficha de producto,
 * volver, entrar a otra y aparecer a media página, sin haber visto ni el título
 * ni la foto—. El navegador solo restaura el scroll en una navegación de
 * historial; una navegación nueva, para él, no ocurrió.
 *
 * Dos decisiones que no son detalle:
 *
 * · **Atrás y adelante NO se tocan** (`POP`). Ahí conservar la posición es lo
 *   correcto: quien vuelve al catálogo desde un producto espera reaparecer
 *   donde estaba, no arriba de todo, y esa restauración ya la hace el navegador.
 *
 * · **Solo se mira `pathname`**, no el query string. En el catálogo, filtrar y
 *   paginar cambian la URL sin cambiar de página; saltar arriba en cada clic de
 *   un filtro arruinaría el uso.
 *
 * Y la ruta anterior se guarda en una referencia en lugar de confiar en las
 * dependencias del efecto. No es ceremonia: al filtrar, `pathname` no cambia
 * pero `useNavigationType` pasa de `POP` a `PUSH`, así que el efecto se vuelve a
 * ejecutar igual. Comparar contra la ruta que había es lo único que distingue
 * "otra página" de "la misma con otros parámetros".
 *
 * Consecuencia asumida: navegar a la ruta en la que ya estás no sube al tope.
 *
 * `useLayoutEffect` y no `useEffect` para que el salto ocurra antes de pintar:
 * con `useEffect` se alcanza a ver un fotograma de la página nueva en la
 * posición vieja.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const tipoDeNavegacion = useNavigationType();
  const rutaAnterior = useRef(pathname);

  useLayoutEffect(() => {
    const cambioDePagina = pathname !== rutaAnterior.current;
    rutaAnterior.current = pathname;

    // Atrás y adelante los resuelve el navegador; acá sólo hay que apartarse.
    // La referencia ya quedó al día: si desde aquí se navega hacia adelante,
    // el punto de comparación es esta ruta y no la de antes de volver.
    if (tipoDeNavegacion === 'POP') return;
    if (!cambioDePagina) return;

    // `behavior: 'instant'`: esto no es un desplazamiento que el usuario deba
    // seguir con la vista, es el punto de partida de otra página.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, tipoDeNavegacion]);

  return null;
}
