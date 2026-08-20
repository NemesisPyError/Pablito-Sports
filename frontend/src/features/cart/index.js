/**
 * Superficie pública del feature `cart` (DEP-08).
 *
 * Ningún otro feature importa desde el interior de éste.
 */
export { CartPage } from './pages/CartPage.jsx';
export { useCart } from './hooks/useCart.js';
export { useCartRevalidation, REVALIDATION_STATE } from './hooks/useCartRevalidation.js';
export { useCartSync } from './hooks/useCartSync.js';
export { MAX_DISTINCT_ITEMS, MAX_QUANTITY, MIN_QUANTITY, CART_ERRORS } from './stores/cartStore.js';
export { buildInquiry, MESSAGE_WORKING_LIMIT } from './whatsapp/index.js';
