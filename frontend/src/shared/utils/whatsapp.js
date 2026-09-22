/**
 * Enlace `wa.me` sin texto precargado — para CTAs de "escribinos" que no
 * arrastran un mensaje armado (a diferencia de `buildWhatsAppLink` en
 * `features/cart/whatsapp`, que sí compone el pedido del carrito).
 *
 * Antes vivía duplicada como función local en `StoryBlock.jsx`; `PublicFooter`
 * necesita la misma lógica (v2.9.6), así que pasa a compartida en vez de
 * copiarse una vez más.
 */
export function simpleWhatsAppHref(numero) {
  const digitos = String(numero ?? '').replace(/\D/g, '');
  return digitos ? `https://wa.me/${digitos}` : null;
}
