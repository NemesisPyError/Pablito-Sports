import { useState } from 'react';

import { AvailabilityBadge } from '../../../../shared/components/AvailabilityBadge.jsx';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { getStockStatus } from '../../../../shared/utils/stock.js';
import {
  useDeleteVariant,
  useProductVariants,
  useRegisterSale,
  useUpdateVariantQuantity,
} from '../hooks/useProductMedia.js';

/**
 * Variantes del producto (05_API.md §9.4).
 *
 * La variante **no se edita ni se crea a mano**: §9.4 dice que se generan y
 * reconcilian automáticamente al modificar los talles del producto (`AD-15`).
 * Lo que sí se carga acá, desde v1.4.0, es la
 * cantidad real de cada variante (`RN-38b`) — la disponibilidad (de la
 * variante y del producto) se deriva de esa cantidad, no se elige a mano.
 */
export function VariantsSection({ productId }) {
  const { data: variantes, isLoading, isError, refetch } = useProductVariants(productId);
  const eliminar = useDeleteVariant(productId);

  const [aEliminar, setAEliminar] = useState(null);

  const items = variantes ?? [];

  return (
    <section className="card mb-3">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <h2 className="h6 mb-0">Variantes</h2>
        {items.length > 0 && <span className="badge text-bg-light border">{items.length}</span>}
      </div>

      <div className="card-body p-0">
        {isError ? (
          <div className="text-center py-3">
            <p className="small text-muted mb-2">No pudimos cargar las variantes.</p>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={refetch}>
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <ul className="list-group list-group-flush" aria-hidden="true">
            {Array.from({ length: 3 }, (_, indice) => (
              <li className="list-group-item placeholder-glow" key={indice}>
                <span className="placeholder col-5" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin variantes"
            message="Las variantes se generan al asignar talles al producto."
          />
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((variante) => (
              <VariantRow
                key={variante.id}
                productId={productId}
                variante={variante}
                onEliminar={() => setAEliminar(variante)}
                eliminando={eliminar.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="card-footer bg-white">
        <p className="small text-muted mb-0">
          Las variantes se generan automáticamente a partir de los talles del producto. La
          disponibilidad se calcula sola: más de 5 unidades es &ldquo;Disponible&rdquo;,
          de 1 a 5 es &ldquo;Stock bajo&rdquo;, 0 es &ldquo;No disponible&rdquo;.
        </p>
      </div>

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar variante"
        message={
          aEliminar ? `La combinación ${descripcion(aEliminar)} dejará de estar disponible.` : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={() => eliminar.mutate(aEliminar.id, { onSettled: () => setAEliminar(null) })}
        onCancel={() => setAEliminar(null)}
      />
    </section>
  );
}

function VariantRow({ productId, variante, onEliminar, eliminando }) {
  const actualizar = useUpdateVariantQuantity(productId);
  const vender = useRegisterSale(productId);
  const [cantidad, setCantidad] = useState(String(variante.quantity ?? 0));
  const [vendiendo, setVendiendo] = useState(false);
  const [cantidadVenta, setCantidadVenta] = useState('1');
  const [errorVenta, setErrorVenta] = useState(null);

  // El valor en pantalla previsualiza el estado con lo que el administrador
  // está escribiendo, antes de guardar — sin esperar la respuesta del server.
  const cantidadNumerica = Number.parseInt(cantidad, 10);
  const previsualizacion = Number.isNaN(cantidadNumerica)
    ? variante.availability
    : getStockStatus(cantidadNumerica);

  function guardar() {
    const valor = Number.parseInt(cantidad, 10);
    if (Number.isNaN(valor) || valor < 0) {
      setCantidad(String(variante.quantity ?? 0));
      return;
    }
    if (valor === variante.quantity) return;
    actualizar.mutate({ variantId: variante.id, quantity: valor });
  }

  function abrirVenta() {
    setCantidadVenta('1');
    setErrorVenta(null);
    setVendiendo(true);
  }

  function cancelarVenta() {
    setVendiendo(false);
    setErrorVenta(null);
  }

  function confirmarVenta() {
    const valor = Number.parseInt(cantidadVenta, 10);
    if (Number.isNaN(valor) || valor <= 0) {
      setErrorVenta('Ingresá una cantidad mayor a cero.');
      return;
    }
    // RN-82: el servidor es quien decide si alcanza el stock (`409` si no);
    // acá solo se evita el viaje obvio de pedir más de lo que se ve en pantalla.
    if (valor > variante.quantity) {
      setErrorVenta(`No hay ${valor} unidades — quedan ${variante.quantity}.`);
      return;
    }
    vender.mutate(
      { variantId: variante.id, quantity: valor },
      {
        onSuccess: (data) => {
          setVendiendo(false);
          setCantidad(String(data.quantity));
        },
        onError: (error) => setErrorVenta(mensajeDeVenta(error)),
      },
    );
  }

  return (
    <li className="list-group-item">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span className="small">
          {descripcion(variante)}
          <span className="text-muted ms-2">#{variante.id}</span>
        </span>

        <div className="d-flex align-items-center gap-2">
          <label className="visually-hidden" htmlFor={`cantidad-${variante.id}`}>
            Cantidad de {descripcion(variante)}
          </label>
          <input
            id={`cantidad-${variante.id}`}
            type="number"
            min={0}
            step={1}
            className="form-control form-control-sm"
            style={{ width: '5.5rem' }}
            value={cantidad}
            onChange={(evento) => setCantidad(evento.target.value)}
            onBlur={guardar}
            disabled={actualizar.isPending}
          />
          <AvailabilityBadge availability={previsualizacion} />
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={vendiendo ? cancelarVenta : abrirVenta}
            disabled={variante.quantity === 0 && !vendiendo}
          >
            {vendiendo ? 'Cancelar venta' : 'Registrar venta'}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={onEliminar}
            disabled={eliminando}
          >
            Eliminar
          </button>
        </div>
      </div>

      {vendiendo && (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-2 pt-2 border-top">
          <label className="small text-muted mb-0" htmlFor={`venta-${variante.id}`}>
            Unidades vendidas
          </label>
          <input
            id={`venta-${variante.id}`}
            type="number"
            min={1}
            max={variante.quantity}
            step={1}
            className={`form-control form-control-sm ${errorVenta ? 'is-invalid' : ''}`}
            style={{ width: '5.5rem' }}
            value={cantidadVenta}
            onChange={(evento) => {
              setCantidadVenta(evento.target.value);
              setErrorVenta(null);
            }}
            disabled={vender.isPending}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={confirmarVenta}
            disabled={vender.isPending}
          >
            {vender.isPending ? 'Registrando…' : 'Confirmar'}
          </button>
          {errorVenta && <p className="invalid-feedback d-block mb-0">{errorVenta}</p>}
        </div>
      )}
    </li>
  );
}

/** Traduce el código del contrato, nunca el mensaje del servidor (`ERR-04`). */
function mensajeDeVenta(error) {
  if (error?.status === 429) return RATE_LIMIT_MESSAGE;
  if (error?.status === 409) return 'No hay stock suficiente para esa cantidad.';
  if (error?.status === 422) return 'Ingresá una cantidad válida.';
  if (error?.status === 404) return 'La variante ya no existe. Recargá la página.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos registrar la venta. Intentá de nuevo.';
}

/** `VariantDTO` (§10.5): `size` puede ser nulo si el producto no usa talles. */
function descripcion(variante) {
  return variante.size?.name ?? 'Variante única';
}
