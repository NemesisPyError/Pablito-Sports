import { useCallback, useEffect, useState } from 'react';

import { formatGuaranies } from '../../../shared/formatters/currency.js';
import { Page } from '../../../shared/components/Page.jsx';
import { CartItemRow } from '../components/CartItemRow.jsx';
import { DiscrepancyNotice } from '../components/DiscrepancyNotice.jsx';
import { RevalidationFailureNotice } from '../components/RevalidationFailureNotice.jsx';
import { usePublicWhatsAppTemplate } from '../../store/index.js';
import { useCart } from '../hooks/useCart.js';
import { REVALIDATION_STATE, useCartRevalidation } from '../hooks/useCartRevalidation.js';
import { useCartSync } from '../hooks/useCartSync.js';
import { buildInquiry } from '../whatsapp/index.js';

const MIGAS = [{ label: 'Inicio', to: '/' }, { label: 'Carrito' }];

/**
 * Vista del carrito de consulta.
 *
 * Orquesta la pantalla: pide datos, compone componentes y no calcula reglas de
 * negocio (06_FRONTEND.md §7.4).
 */
export function CartPage({ storeSettings }) {
  const cart = useCart();
  const revalidation = useCartRevalidation();
  useCartSync();

  // `RN-59`: la plantilla que compone el mensaje es la que editó el
  // administrador. Vive en su propio recurso porque `StoreSettingsPublicDTO`
  // (§10.2) no la expone. Si la petición falla, `buildInquiry` cae en la
  // plantilla por defecto (`RN-61`) y la consulta se genera igual.
  const { data: whatsappTemplate } = usePublicWhatsAppTemplate();

  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [notice, setNotice] = useState(null);
  const [networkFallback, setNetworkFallback] = useState(false);

  const revalidate = useCallback(async () => {
    setNotice(null);
    setNetworkFallback(false);
    const resolved = await revalidation.revalidate();
    if (resolved?.hasBlockingChanges) {
      // RN-77, RN-78: hay que mostrar los cambios y esperar confirmación.
      setPendingConfirmation(true);
    }
    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // RN-56, momento 1: revalidación al abrir el carrito.
  useEffect(() => {
    cart.discardIfStale();
    revalidate();
    // Se ejecuta una vez al montar la vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** El cliente confirma el carrito actualizado. AD-25: no vuelve a revalidar. */
  const confirmChanges = useCallback(() => {
    if (revalidation.result) {
      cart.removeItems(revalidation.result.removable);
      cart.applyRevalidation(revalidation.result.items.map((item) => item.server).filter(Boolean));
    }
    setPendingConfirmation(false);
    revalidation.reset();
  }, [cart, revalidation]);

  const openWhatsApp = useCallback(
    (items) => {
      const inquiry = buildInquiry({
        items,
        templates: whatsappTemplate,
        storeName: storeSettings?.store_name,
        whatsappNumber: storeSettings?.whatsapp_number,
      });

      if (!inquiry.ok) {
        // RN-76: se advierte y no se abre WhatsApp.
        setNotice(
          `Tu consulta es demasiado larga (${inquiry.budget.length} de ${inquiry.budget.workingLimit} caracteres). Quitá algún producto e intentá de nuevo.`,
        );
        return;
      }

      // RN-62: el cliente confirma el envío desde WhatsApp.
      window.open(inquiry.url, '_blank', 'noopener');
    },
    [storeSettings, whatsappTemplate],
  );

  /** RN-56, momento 2: revalidación antes de generar el mensaje. */
  const handleSend = useCallback(async () => {
    const resolved = await revalidate();

    if (!resolved) {
      // RN-81: no se pudo verificar. Reintentar · Cancelar · Enviar igualmente.
      setNetworkFallback(true);
      return;
    }
    if (resolved.hasBlockingChanges) {
      setPendingConfirmation(true);
      return;
    }
    openWhatsApp(resolved.items);
  }, [revalidate, openWhatsApp]);

  const sendAnyway = useCallback(() => {
    setNetworkFallback(false);
    openWhatsApp(
      cart.items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        snapshot: item.snapshot,
        server: null,
      })),
    );
  }, [cart.items, openWhatsApp]);

  const changedIds = new Set(
    (revalidation.result?.items ?? [])
      .filter((item) => item.changes.length > 0)
      .map((item) => item.variant_id),
  );

  if (!cart.items.length) {
    return (
      <Page title="Tu carrito de consulta" breadcrumbs={MIGAS} narrow>
        <p className="text-muted">Todavía no agregaste productos.</p>
      </Page>
    );
  }

  return (
    <Page title="Tu carrito de consulta" eyebrow="Consulta por WhatsApp" breadcrumbs={MIGAS}>
      {revalidation.state === REVALIDATION_STATE.LOADING && (
        <p className="text-muted small">Verificando precios y disponibilidad…</p>
      )}

      {/* AD-30: "verificado sin cambios" y "no se pudo verificar" son distintos. */}
      {revalidation.state === REVALIDATION_STATE.VERIFIED && !pendingConfirmation && (
        <p className="text-success small">Precios y disponibilidad verificados.</p>
      )}
      {revalidation.state === REVALIDATION_STATE.UNVERIFIED && !networkFallback && (
        <p className="text-secondary small">No pudimos verificar los precios en este momento.</p>
      )}

      {pendingConfirmation && revalidation.result && (
        <DiscrepancyNotice items={revalidation.result.items} onConfirm={confirmChanges} />
      )}

      {networkFallback && (
        <RevalidationFailureNotice
          onRetry={handleSend}
          onCancel={() => setNetworkFallback(false)}
          onSendAnyway={sendAnyway}
        />
      )}

      {notice && (
        <div className="alert alert-danger" role="alert">
          {notice}
        </div>
      )}

      <ul className="list-group my-3">
        {cart.items.map((item) => (
          <CartItemRow
            key={item.variant_id}
            item={item}
            changed={changedIds.has(item.variant_id)}
            onQuantityChange={cart.updateQuantity}
            onRemove={cart.removeItem}
          />
        ))}
      </ul>

      <div className="d-flex justify-content-between align-items-center">
        <p className="mb-0 fs-5">
          Total estimado: <strong>{formatGuaranies(cart.total)}</strong>
        </p>
        <button
          type="button"
          className="btn btn-success"
          onClick={handleSend}
          disabled={pendingConfirmation || revalidation.state === REVALIDATION_STATE.LOADING}
        >
          Consultar por WhatsApp
        </button>
      </div>
      <p className="text-muted small mt-2">Precios sujetos a confirmación del vendedor.</p>
    </Page>
  );
}
