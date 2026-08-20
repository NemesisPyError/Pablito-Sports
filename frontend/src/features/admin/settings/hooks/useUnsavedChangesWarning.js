import { useEffect } from 'react';

/**
 * Advierte antes de abandonar la pestaña con cambios sin guardar.
 *
 * Solo cubre la salida del **documento**: recargar, cerrar la pestaña o navegar
 * a otro sitio. Moverse a otra pantalla del panel no dispara `beforeunload`,
 * porque el router no recarga el documento; para eso haría falta un bloqueo de
 * navegación, que `react-router` 6.28 expone como API inestable y queda fuera
 * de esta tanda.
 *
 * El navegador ignora cualquier mensaje propio y muestra el suyo: se asigna
 * `returnValue` porque es lo que activa el diálogo, no porque el texto llegue a
 * verse.
 */
export function useUnsavedChangesWarning(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    function alSalir(evento) {
      evento.preventDefault();
      evento.returnValue = '';
    }

    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [enabled]);
}
