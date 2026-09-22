import { useEffect, useMemo, useRef, useState } from 'react';

import { formatGuaranies } from '../../../../shared/formatters/currency.js';
import { useAdminProducts } from '../hooks/useAdminProducts.js';
import { useRegisterManualSale } from '../hooks/useManualSale.js';
import { useAdminProduct } from '../hooks/useProductActions.js';
import {
  addLine,
  buildLine,
  committedQuantity,
  lineSubtotal,
  parseEntero,
  removeLine,
  saleErrorMessage,
  saleTotal,
  sellableVariants,
  toRequestItems,
} from '../utils/manualSale.js';

/**
 * Registro manual de una venta desde el listado de Productos (§9.19).
 *
 * El flujo es el del pedido: elegir producto → talle → precio → cantidad →
 * Agregar → resumen → Confirmar. Se arma un borrador en memoria y **no se
 * escribe nada** hasta confirmar; la venta entera viaja en una sola petición
 * porque el descuento de stock tiene que ser atómico.
 *
 * Sobre el precio: se propone el vigente (`effective_price`, que el backend
 * calcula conciliando oferta y promoción) y se puede cambiar. Se envía siempre
 * explícito, de modo que el total que el administrador confirmó en el resumen
 * es exactamente el que queda registrado.
 *
 * Lo que se valida acá es ayuda, no control: el stock puede cambiar mientras el
 * modal está abierto, así que el backend vuelve a comprobarlo todo dentro de la
 * transacción, con la fila bloqueada. Un rechazo del servidor se muestra tal
 * cual y el borrador se conserva para poder corregirlo.
 *
 * Reutiliza el marcado de `ConfirmDialog`: `modal-backdrop` + `modal show
 * d-block`, foco al abrir y cierre con `Escape`.
 */
export function ManualSaleDialog({ isOpen, onClose }) {
  const [busqueda, setBusqueda] = useState('');
  const [productoId, setProductoId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('');
  const [lineas, setLineas] = useState([]);
  const [errorLinea, setErrorLinea] = useState(null);
  const [registrada, setRegistrada] = useState(null);

  const cerrarRef = useRef(null);
  const registrar = useRegisterManualSale();

  const listado = useAdminProducts({
    q: busqueda,
    brand: '',
    category: '',
    availability: '',
    is_active: '',
    sort: 'name_asc',
    page: 1,
    per_page: 20,
  });
  const detalle = useAdminProduct(productoId || null);

  const producto = detalle.data ?? null;
  const variantes = useMemo(() => sellableVariants(producto?.variants), [producto]);
  const variante = variantes.find((v) => String(v.id) === String(variantId)) ?? null;

  // Al elegir producto se propone su precio vigente y, si hay un solo talle
  // vendible, se elige solo: no tiene sentido pedir que elija entre uno.
  useEffect(() => {
    if (!producto) return;
    setPrecio(String(producto.effective_price ?? producto.list_price ?? ''));
    setVariantId(variantes.length === 1 ? String(variantes[0].id) : '');
  }, [producto, variantes]);

  useEffect(() => {
    if (!isOpen) return undefined;
    cerrarRef.current?.focus();

    function alPulsar(evento) {
      if (evento.key === 'Escape' && !registrar.isPending) onClose?.();
    }
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [isOpen, registrar.isPending, onClose]);

  // Cada apertura empieza en blanco: un borrador viejo llevaría a registrar una
  // venta que el administrador no compuso en esta sesión.
  useEffect(() => {
    if (isOpen) return;
    setBusqueda('');
    setProductoId('');
    setVariantId('');
    setCantidad('1');
    setPrecio('');
    setLineas([]);
    setErrorLinea(null);
    setRegistrada(null);
    registrar.reset();
    // `registrar` es estable entre renders (react-query); incluirlo dispararía
    // el efecto en cada cambio de estado de la mutación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const total = saleTotal(lineas);
  const disponibleRestante = variante
    ? variante.quantity - committedQuantity(lineas, variante.id)
    : null;

  function agregar() {
    setErrorLinea(null);
    if (!producto || !variante) {
      setErrorLinea('Elegí un producto y un talle.');
      return;
    }
    const unidades = parseEntero(cantidad);
    const importe = parseEntero(precio);
    if (unidades === null) {
      setErrorLinea('La cantidad debe ser un número entero mayor a cero.');
      return;
    }
    if (importe === null) {
      setErrorLinea('El precio debe ser un número entero de cero o más.');
      return;
    }

    const resultado = addLine(
      lineas,
      buildLine({ product: producto, variant: variante, quantity: unidades, unitPrice: importe }),
    );
    if (resultado.error) {
      setErrorLinea(resultado.error);
      return;
    }
    setLineas(resultado.lines);
    setCantidad('1');
  }

  function confirmar() {
    setErrorLinea(null);
    registrar.mutate(toRequestItems(lineas), {
      onSuccess: (venta) => {
        setRegistrada(venta);
        setLineas([]);
      },
    });
  }

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manualSaleTitle"
        tabIndex={-1}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h6" id="manualSaleTitle">
                Registrar venta
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                ref={cerrarRef}
                onClick={onClose}
                disabled={registrar.isPending}
              />
            </div>

            <div className="modal-body">
              {registrada ? (
                <ResumenRegistrado venta={registrada} onOtra={() => setRegistrada(null)} />
              ) : (
                <>
                  <SelectorDeLinea
                    busqueda={busqueda}
                    onBuscar={setBusqueda}
                    listado={listado}
                    productoId={productoId}
                    onProducto={(valor) => {
                      setProductoId(valor);
                      setVariantId('');
                      setErrorLinea(null);
                    }}
                    detalleCargando={detalle.isLoading}
                    variantes={variantes}
                    variantId={variantId}
                    onVariante={setVariantId}
                    tieneProducto={Boolean(producto)}
                    disponibleRestante={disponibleRestante}
                    precio={precio}
                    onPrecio={setPrecio}
                    cantidad={cantidad}
                    onCantidad={setCantidad}
                    onAgregar={agregar}
                    deshabilitado={registrar.isPending}
                  />

                  {errorLinea && (
                    <div className="alert alert-warning py-2 small" role="alert">
                      {errorLinea}
                    </div>
                  )}

                  <TablaDeLineas
                    lineas={lineas}
                    total={total}
                    onQuitar={(id) => setLineas(removeLine(lineas, id))}
                    deshabilitado={registrar.isPending}
                  />

                  {registrar.isError && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      {saleErrorMessage(registrar.error)}
                    </div>
                  )}
                </>
              )}
            </div>

            {!registrada && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={registrar.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmar}
                  disabled={lineas.length === 0 || registrar.isPending}
                  data-testid="confirmar-venta"
                >
                  {registrar.isPending
                    ? 'Registrando…'
                    : `Confirmar venta · ${formatGuaranies(total)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Los campos con los que se arma una línea. */
function SelectorDeLinea({
  busqueda,
  onBuscar,
  listado,
  productoId,
  onProducto,
  detalleCargando,
  variantes,
  variantId,
  onVariante,
  tieneProducto,
  disponibleRestante,
  precio,
  onPrecio,
  cantidad,
  onCantidad,
  onAgregar,
  deshabilitado,
}) {
  const productos = listado.data?.items ?? [];

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="mb-3">
          <label htmlFor="venta-busqueda" className="form-label">
            Buscar producto
          </label>
          <input
            id="venta-busqueda"
            type="search"
            className="form-control"
            placeholder="Nombre o SKU"
            value={busqueda}
            onChange={(evento) => onBuscar(evento.target.value)}
            disabled={deshabilitado}
          />
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="venta-producto" className="form-label">
              Producto
            </label>
            <select
              id="venta-producto"
              className="form-select"
              value={productoId}
              onChange={(evento) => onProducto(evento.target.value)}
              disabled={deshabilitado || listado.isLoading}
            >
              <option value="">Elegí un producto</option>
              {productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.name}
                </option>
              ))}
            </select>
            {listado.isLoading && (
              <p className="form-text mb-0" role="status">
                Cargando productos…
              </p>
            )}
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="venta-talle" className="form-label">
              Talle
            </label>
            <select
              id="venta-talle"
              className="form-select"
              value={variantId}
              onChange={(evento) => onVariante(evento.target.value)}
              disabled={deshabilitado || !tieneProducto || detalleCargando}
            >
              <option value="">
                {/* Sin stock no hay nada que vender: esas variantes ni
                    aparecen, en vez de ofrecerlas y rechazarlas después. */}
                {variantes.length === 0 ? 'Sin talles con stock' : 'Elegí un talle'}
              </option>
              {variantes.map((variante) => (
                <option key={variante.id} value={variante.id}>
                  {(variante.size?.name ?? 'Único') + ` — ${variante.quantity} disponibles`}
                </option>
              ))}
            </select>
            {disponibleRestante !== null && (
              <p className="form-text mb-0" data-testid="stock-disponible">
                Máximo disponible: {disponibleRestante}
              </p>
            )}
          </div>

          <div className="col-6 col-md-4">
            <label htmlFor="venta-precio" className="form-label">
              Precio unitario
            </label>
            <input
              id="venta-precio"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="form-control"
              value={precio}
              onChange={(evento) => onPrecio(evento.target.value)}
              disabled={deshabilitado || !tieneProducto}
            />
            <p className="form-text mb-0">Se propone el vigente; podés cambiarlo.</p>
          </div>

          <div className="col-6 col-md-4">
            <label htmlFor="venta-cantidad" className="form-label">
              Cantidad
            </label>
            <input
              id="venta-cantidad"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="form-control"
              value={cantidad}
              onChange={(evento) => onCantidad(evento.target.value)}
              disabled={deshabilitado || !tieneProducto}
            />
          </div>

          <div className="col-12 col-md-4 d-flex align-items-end">
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              onClick={onAgregar}
              disabled={deshabilitado}
              data-testid="agregar-linea"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** El borrador de la venta: líneas, subtotales y total. */
function TablaDeLineas({ lineas, total, onQuitar, deshabilitado }) {
  if (lineas.length === 0) {
    return (
      <p className="text-muted small mb-0" data-testid="sin-lineas">
        Todavía no agregaste ningún producto a esta venta.
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <caption className="visually-hidden">Productos de esta venta</caption>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Talle</th>
            <th scope="col" className="text-end">
              Precio
            </th>
            <th scope="col" className="text-end">
              Cantidad
            </th>
            <th scope="col" className="text-end">
              Subtotal
            </th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea) => (
            <tr key={linea.variantId} data-testid="linea-venta">
              <td>{linea.productName}</td>
              <td>{linea.sizeName ?? 'Único'}</td>
              <td className="text-end">{formatGuaranies(linea.unitPrice)}</td>
              <td className="text-end">{linea.quantity}</td>
              <td className="text-end" data-testid="subtotal">
                {formatGuaranies(lineSubtotal(linea))}
              </td>
              <td className="text-end">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onQuitar(linea.variantId)}
                  disabled={deshabilitado}
                  aria-label={`Quitar ${linea.productName}`}
                >
                  Quitar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4} className="text-end">
              Total
            </th>
            <td className="text-end fw-semibold" data-testid="total-venta">
              {formatGuaranies(total)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Confirmación de que la venta quedó registrada, con lo que se descontó. */
function ResumenRegistrado({ venta, onOtra }) {
  return (
    <div data-testid="venta-registrada">
      <div className="alert alert-success py-2" role="status">
        Venta registrada por {formatGuaranies(venta.total_amount)}. El stock ya fue descontado.
      </div>

      <ul className="list-group list-group-flush mb-3">
        {venta.items.map((item) => (
          <li className="list-group-item px-0" key={item.variant_id}>
            <div className="d-flex justify-content-between gap-2">
              <span>
                {item.product_name}
                {item.size?.name ? ` · ${item.size.name}` : ''} × {item.quantity}
              </span>
              <span>{formatGuaranies(item.subtotal)}</span>
            </div>
            <span className="small text-muted">
              Quedan {item.remaining_quantity} unidades de ese talle.
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="btn btn-outline-primary" onClick={onOtra}>
        Registrar otra venta
      </button>
    </div>
  );
}
