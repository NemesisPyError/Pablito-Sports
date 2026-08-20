import { useEffect, useRef } from 'react';

/**
 * `<textarea>` que crece con su contenido.
 *
 * Sin librerías: se ajusta la altura al `scrollHeight` en cada cambio. El
 * `height = 'auto'` previo es necesario para que el `scrollHeight` pueda
 * **bajar**; sin él la caja crecería pero nunca volvería a encogerse.
 *
 * `minRows` fija el piso mediante el atributo `rows`, de modo que el control
 * ocupa su alto natural antes de que llegue el primer valor.
 */
export function AutoResizeTextarea({ value, minRows = 3, className = '', ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    elemento.style.height = 'auto';
    elemento.style.height = `${elemento.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      // `overflow-hidden` evita la barra que aparecería durante el instante en
      // que el contenido supera la altura vieja.
      className={`form-control overflow-hidden ${className}`}
      {...props}
    />
  );
}
