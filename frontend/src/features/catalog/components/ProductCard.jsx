import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { AvailabilityBadge } from '../../../shared/components/AvailabilityBadge.jsx';
import { Image } from '../../../shared/components/Image.jsx';
import { PriceBadge } from '../../../shared/components/PriceBadge.jsx';
import { mensajeDeRechazo, useCart } from '../../cart/index.js';
import { useProduct } from '../../products/index.js';
import styles from './ProductCard.module.css';

const VARIANT_CLASS = {
  grid: styles.variantGrid,
  rail: styles.variantRail,
  compact: styles.variantCompact,
};

/**
 * §7.5: la tarjeta nunca ocupa el ancho completo. Se declara qué porción de
 * la ventana ocupa en cada tramo para que el navegador elija el derivado más
 * chico que sirva, en lugar del más grande disponible.
 */
const IMAGE_SIZES = '(min-width: 992px) 20vw, (min-width: 768px) 30vw, 45vw';

/**
 * Talles visibles antes de resumir el resto en "+N" (09_COMPONENTES.md
 * §9.8). La tarjeta es compacta a propósito: un producto con toda su curva
 * de talles no puede alargarla sin romper la grilla.
 */
const MAX_VISIBLE_SIZES = 6;

/**
 * Tarjeta de producto para listados y carriles.
 *
 * 09_COMPONENTES.md §9.8: no calcula precios, no llama a la API y no cambia
 * de estructura según el viewport —`variant` es una decisión de composición
 * de quien la usa, no del ancho de pantalla—.
 *
 * Compra rápida: `ProductListItemDTO.available_sizes` no trae `variant_id`
 * ni stock (solo `{slug, name}`), y `RN-53` fija la variante como unidad del
 * carrito. Por eso la fila de talles activa, al primer intento de selección,
 * el mismo fetch de detalle que usa la ficha (`useProduct`, cacheado por
 * `slug` vía React Query) para resolver `variant.id` y su stock real, en vez
 * de duplicar esa información en el backend o inventarla en el cliente. Sin
 * `available_sizes` la tarjeta no ofrece compra rápida y se comporta como
 * antes: solo el enlace al detalle.
 */
/**
 * Cuánto hay que sostener el dedo antes de que la tarjeta muestre la segunda
 * foto. Un toque normal (abrir el producto) dura bastante menos que esto, así
 * que el swap solo ocurre ante una intención clara de "mantener apretado" y el
 * tap no parpadea a la segunda imagen.
 */
const TOUCH_HOLD_MS = 180;

/**
 * Cuánto puede desplazarse el dedo, en píxeles, sin que el gesto se considere
 * un scroll. Un dedo apoyado nunca está quieto: cancelar con el primer
 * `touchmove` haría imposible sostener la tarjeta en un teléfono real.
 */
const TOUCH_MOVE_TOLERANCIA_PX = 12;

/**
 * Aviso de que la foto cambia al mantener apretado o pasar el cursor. Vive
 * como texto de sección (`SectionHeader`, un símbolo por carril en vez de uno
 * por tarjeta) pero la frase es propiedad de esta pieza: es la que sabe qué
 * gesto ofrece. `ProductRail`/`NewArrivalsCarousel` deciden si mostrarla con
 * la misma condición que activa el long-press acá abajo
 * (`product.secondary_thumbnail_url`).
 */
export const IMAGE_SWAP_HINT_TEXT = 'Mantené apretado o pasá el cursor para cambiar de imagen';

export function ProductCard({ product, variant = 'grid', priority = false }) {
  const hasDiscount = product.sale_price != null && product.sale_price < product.list_price;
  const cart = useCart();

  const hasSizes = product.available_sizes?.length > 0;

  // Se activa recién con la primera intención de elegir un talle (hover/foco
  // en desktop, toque en mobile): así no se dispara un fetch de detalle por
  // cada tarjeta que entra en pantalla, solo por la que el cliente realmente
  // usa para comprar.
  const [quickBuyActive, setQuickBuyActive] = useState(false);
  const [selectedSizeSlug, setSelectedSizeSlug] = useState(null);
  const [quickBuyError, setQuickBuyError] = useState(null);
  const [added, setAdded] = useState(false);

  const { data: detail, isLoading: variantsLoading } = useProduct(
    quickBuyActive ? product.slug : undefined,
  );

  const activateQuickBuy = useCallback(() => setQuickBuyActive(true), []);

  const selectedVariant = detail?.variants?.find((v) => v.size?.slug === selectedSizeSlug) ?? null;
  const variantsResolved = quickBuyActive && !variantsLoading && detail != null;
  // Hasta que resuelve el detalle no se sabe si sigue disponible (pudo
  // venderse desde que se armó el listado): mientras carga, el talle se
  // muestra elegido pero el botón de agregar espera el dato real.
  const selectionUnavailable =
    variantsResolved &&
    selectedSizeSlug != null &&
    (!selectedVariant || selectedVariant.availability === 'out_of_stock');

  const handleSelectSize = (slug) => {
    setAdded(false);
    setQuickBuyError(null);
    setSelectedSizeSlug((current) => (current === slug ? null : slug));
  };

  const handleQuickAdd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedVariant) return;

    setQuickBuyError(null);
    const result = cart.addItem(
      selectedVariant.id,
      1,
      {
        slug: product.slug,
        name: product.name,
        brand: product.brand?.name,
        size: selectedVariant.size?.name ?? null,
        thumbnail_url: product.thumbnail_url,
        list_price: product.list_price,
        sale_price: product.sale_price,
        availability: selectedVariant.availability ?? product.availability,
        available_quantity: selectedVariant.available_quantity ?? null,
      },
      selectedVariant.available_quantity ?? null,
    );

    if (!result.ok) {
      setQuickBuyError(mensajeDeRechazo(result, selectedVariant.size?.name));
    } else {
      setAdded(true);
    }
  };

  // Estado SOLO para el gesto táctil. En escritorio el cambio de foto lo hace
  // CSS con `:hover` (ver ProductCard.module.css): manejarlo con estado y
  // `onMouseEnter` disparaba en mobile el heurístico del navegador de
  // "primer toque = revelar hover, segundo toque = accionar", que dejaba una
  // tarjeta pegada en hover e impedía tocar las demás de una sola vez.
  const [touchHold, setTouchHold] = useState(false);
  const holdTimer = useRef(null);
  // Marca que hay un dedo apoyado. Sirve para distinguir el menú contextual
  // nacido de un long-press táctil (que hay que suprimir) del clic derecho de
  // escritorio (que se respeta).
  const dedoApoyado = useRef(false);
  // Punto donde empezó el toque, para medir si el dedo se desplazó.
  const origenToque = useRef(null);
  // El long-press llegó a completarse: al soltar hay que mostrar la foto, no
  // abrir el producto.
  const holdCumplido = useRef(false);

  /** Corta el gesto y suelta el dedo: fin del toque, o scroll declarado. */
  const terminarGesto = useCallback(() => {
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    dedoApoyado.current = false;
    origenToque.current = null;
    setTouchHold(false);
  }, []);

  const startHold = useCallback(
    (evento) => {
      const toque = evento.touches[0];
      dedoApoyado.current = true;
      // Se limpia acá, y no al soltar, para que un `click` que el navegador
      // nunca llegue a emitir no deje la tarjeta sorda al toque siguiente.
      holdCumplido.current = false;
      origenToque.current = toque ? { x: toque.clientX, y: toque.clientY } : null;
      if (!product.secondary_thumbnail_url) return;
      holdTimer.current = setTimeout(() => {
        holdCumplido.current = true;
        setTouchHold(true);
      }, TOUCH_HOLD_MS);
    },
    [product.secondary_thumbnail_url],
  );

  /*
   * `touchmove` no cancela por sí solo: el dedo apoyado tiembla siempre. Solo
   * se abandona el gesto cuando el desplazamiento delata un scroll — más allá
   * de `TOUCH_MOVE_TOLERANCIA_PX`—, y ahí sí la tarjeta no debe quedarse
   * trabada en la segunda foto. Sin `preventDefault`: el scroll de la página
   * tiene que seguir funcionando con el dedo apoyado acá.
   */
  const seguirGesto = useCallback(
    (evento) => {
      const origen = origenToque.current;
      const toque = evento.touches[0];
      if (!origen || !toque) return;
      const distancia = Math.hypot(toque.clientX - origen.x, toque.clientY - origen.y);
      if (distancia > TOUCH_MOVE_TOLERANCIA_PX) terminarGesto();
    },
    [terminarGesto],
  );

  /*
   * El long-press sobre un enlace abre el menú nativo del navegador. En iOS lo
   * frena `-webkit-touch-callout: none` (ProductCard.module.css), pero Android
   * Chrome ignora esa propiedad y hay que cancelar el evento. Sin esto, el menú
   * se abre a mitad del gesto y el toque siguiente lo consume su cierre, de modo
   * que la tarjeta que se quiere abrir después no responde.
   */
  const bloquearMenuTactil = useCallback((evento) => {
    if (dedoApoyado.current) evento.preventDefault();
  }, []);

  /*
   * CAUSA RAÍZ del bloqueo tras mantener presionada la tarjeta.
   *
   * Toda la tarjeta es un enlace (`.link::after` cubre el `<article>`) y encima
   * lleva imágenes. Enlaces e imágenes son arrastrables de forma nativa, así que
   * mantener presionado y moverse un par de píxeles —lo que pasa siempre, con el
   * dedo o con la mano en el mouse— hace que el navegador inicie un drag HTML5
   * en lugar de un clic. Verificado en el navegador, la secuencia era:
   *
   *   pointerdown → mousedown → dragstart → pointercancel → dragend
   *
   * Nunca llegan `mouseup` ni `click`: la interacción de puntero muere en
   * `pointercancel`. La tarjeta no se abre, queda la imagen fantasma del drag
   * siguiendo al cursor y el navegador se traga el clic siguiente.
   *
   * Se cancela el arrastre en el `<article>`: `dragstart` burbujea desde el
   * enlace y desde las imágenes, de modo que un único handler acá cubre toda la
   * tarjeta sin tocar `Image` ni ningún listener global. Se pierde la
   * posibilidad de arrastrar el enlace a la barra de marcadores; abrir en pestaña
   * nueva (clic medio, menú contextual) sigue intacto.
   */
  const bloquearArrastre = useCallback((evento) => {
    evento.preventDefault();
  }, []);

  /*
   * Sostener la tarjeta es "espiar la otra foto", no "abrir el producto": al
   * soltar, el navegador igual emite un `click` sobre el enlace que cubre la
   * tarjeta y navegaría. Se descarta ese clic —solo el que viene de un
   * long-press cumplido—, así el usuario vuelve al listado tal como estaba.
   *
   * Excepción: un clic dentro de `.quickBuy` (elegir talle, agregar al
   * carrito) no se descarta aunque el long-press se haya cumplido. Sin esto,
   * mantener apretada la tarjeta para ver la segunda foto y soltar sobre un
   * talle —gesto real en un teléfono, el dedo no se levanta y vuelve a bajar
   * en el mismo lugar— dejaba el talle sin poder elegirse: esta función corre
   * en la fase de captura del `<article>`, antes que el propio `onClick` del
   * botón.
   */
  const descartarClicDeHold = useCallback((evento) => {
    if (!holdCumplido.current) return;
    holdCumplido.current = false;
    if (evento.target.closest(`.${styles.quickBuy}`)) return;
    evento.preventDefault();
    evento.stopPropagation();
  }, []);

  // Si la tarjeta se desmonta con el gesto en curso (navegar, cambiar de
  // filtro), el temporizador pendiente quedaría vivo apuntando a un componente
  // que ya no existe.
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  return (
    <article
      className={`${styles.card} ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.grid}`}
      // El gesto táctil vive en el `<article>` y no en `.media`: el enlace que
      // cubre toda la tarjeta (`.link::after`) se pinta por encima de `.media`,
      // así que los eventos táctiles sobre la foto nunca llegaban a un handler
      // puesto ahí.
      onTouchStart={startHold}
      onTouchMove={seguirGesto}
      onTouchEnd={terminarGesto}
      onTouchCancel={terminarGesto}
      onDragStart={bloquearArrastre}
      // Red de seguridad: si el navegador cancela el puntero por su cuenta
      // (arrastre nativo, gesto del sistema), no llegan `touchend` ni `mouseup`
      // y el gesto quedaría abierto — tarjeta trabada en la segunda foto y
      // `dedoApoyado` en `true` suprimiendo el menú contextual para siempre.
      onPointerCancel={terminarGesto}
      onContextMenu={bloquearMenuTactil}
      onClickCapture={descartarClicDeHold}
    >
      <div className={styles.media}>
        <div className={styles.badges}>
          {hasDiscount && product.discount_percentage != null && (
            <span className={`${styles.badge} ${styles.badgeSale}`}>
              -{product.discount_percentage}%
            </span>
          )}
          {product.is_new && <span className={`${styles.badge} ${styles.badgeNew}`}>Nuevo</span>}
        </div>

        <Image
          src={product.thumbnail_url}
          alt={product.name}
          aspectRatio="1 / 1"
          objectFit="contain"
          sizes={IMAGE_SIZES}
          lazy={!priority}
          fetchPriority={priority ? 'high' : 'auto'}
        />

        {/* Segunda foto del producto: aparece con hover, mismo recuadro que
            la principal. Sin segunda foto no se monta nada. */}
        {product.secondary_thumbnail_url && (
          <Image
            src={product.secondary_thumbnail_url}
            alt=""
            aspectRatio="1 / 1"
            objectFit="contain"
            sizes={IMAGE_SIZES}
            className={`${styles.hoverImage} ${touchHold ? styles.hoverImageVisible : ''}`}
          />
        )}
      </div>

      <div className={styles.body}>
        {product.brand?.name && <p className={styles.brand}>{product.brand.name}</p>}

        <h3 className={styles.name}>
          <Link to={`/producto/${product.slug}`} className={styles.link}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.footer}>
          <PriceBadge
            listPrice={product.list_price}
            salePrice={product.sale_price}
            discountPercentage={product.discount_percentage}
            showDiscount={false}
          />

          {/* «Disponible» es lo esperable: decirlo es ruido. «Stock bajo» es
              información de inventario, no un mensaje para el cliente —
              solo se anuncia lo que de verdad cambia la decisión de compra:
              que no hay. */}
          {product.availability === 'out_of_stock' && (
            <div>
              <AvailabilityBadge availability={product.availability} />
            </div>
          )}
        </div>

        {/* Compra rápida: solo los talles con stock real
            (`ProductListItemDTO.available_sizes`, ya filtrado en el servidor)
            son seleccionables. Sin talles cargados no se dibuja nada — la
            tarjeta se comporta como antes, solo el enlace al detalle. */}
        {hasSizes && (
          <div
            className={styles.quickBuy}
            onPointerEnter={activateQuickBuy}
            onPointerDown={activateQuickBuy}
            onFocus={activateQuickBuy}
          >
            <ul className={styles.sizes} role="radiogroup" aria-label="Seleccionar talle">
              {product.available_sizes.slice(0, MAX_VISIBLE_SIZES).map((size) => {
                const isSelected = selectedSizeSlug === size.slug;
                const isUnavailable = isSelected && selectionUnavailable;
                return (
                  <li key={size.slug}>
                    <button
                      type="button"
                      className={`${styles.sizeChip} ${styles.sizeButton} ${
                        isSelected ? styles.sizeButtonSelected : ''
                      } ${isUnavailable ? styles.sizeButtonUnavailable : ''}`}
                      aria-pressed={isSelected}
                      disabled={isUnavailable}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleSelectSize(size.slug);
                      }}
                    >
                      {size.name}
                    </button>
                  </li>
                );
              })}
              {product.available_sizes.length > MAX_VISIBLE_SIZES && (
                <li className={styles.sizeChip} title="Más talles disponibles en la ficha">
                  +{product.available_sizes.length - MAX_VISIBLE_SIZES}
                </li>
              )}
            </ul>

            {selectedSizeSlug != null && (
              <div className={styles.quickBuyActions}>
                {added ? (
                  <Link
                    to="/carrito"
                    className={styles.viewCartLink}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Ver carrito
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.addButton}
                    disabled={!selectedVariant || selectionUnavailable}
                    onClick={handleQuickAdd}
                  >
                    {quickBuyActive && variantsLoading ? 'Cargando…' : 'Agregar'}
                  </button>
                )}
                {quickBuyError && <p className={styles.quickBuyError}>{quickBuyError}</p>}
                {selectionUnavailable && !quickBuyError && (
                  <p className={styles.quickBuyError}>Ese talle ya no está disponible.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
