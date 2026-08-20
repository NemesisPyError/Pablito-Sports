import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AvailabilityBadge } from '../../../shared/components/AvailabilityBadge.jsx';
import { EmptyState } from '../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../shared/components/LoadingState.jsx';
import { Page } from '../../../shared/components/Page.jsx';
import { PriceBadge } from '../../../shared/components/PriceBadge.jsx';
import { Tag } from '../../../shared/components/Tag.jsx';
import { translateGender } from '../../../shared/config/labels.js';
import { productMeta } from '../../../shared/seo/pageMeta.js';
import { useDocumentMeta } from '../../../shared/seo/useDocumentMeta.js';
import { useCart } from '../../cart/index.js';
import { ProductGallery } from '../components/ProductGallery.jsx';
import { VariantSelector } from '../components/VariantSelector.jsx';
import { useProduct } from '../hooks/useProduct.js';

/**
 * Página de ficha de producto.
 */
export function ProductDetailPage({ storeSettings }) {
  const { slug } = useParams();
  const { data: product, isLoading, isError, refetch } = useProduct(slug);
  const cart = useCart();

  // §17.2: título, descripción, canónica y Open Graph de la ficha.
  useDocumentMeta(productMeta(product, storeSettings), storeSettings);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  const primaryImage = useMemo(
    () => product?.images?.find((img) => img.is_primary) ?? product?.images?.[0],
    [product],
  );

  // v1.4.0 (`RN-38b`): la disponibilidad ya es propia de cada variante, no
  // la del producto — dos talles del mismo producto pueden diferir. Antes de
  // elegir, con una sola variante posible no hay ambigüedad; con varias, se
  // usa el estado del producto (agregado) hasta que el cliente elige.
  const variantForAvailability =
    selectedVariant ?? (product?.variants?.length === 1 ? product.variants[0] : null);
  const availabilityForCart = variantForAvailability?.availability ?? product?.availability;

  const handleAddToCart = () => {
    setError(null);
    setAdded(false);

    if (product.variants.length > 0 && !selectedVariant) {
      setError('Seleccioná un talle antes de agregar al carrito.');
      return;
    }

    const variant = selectedVariant ?? product.variants[0];
    if (!variant) {
      setError('No hay variantes disponibles para este producto.');
      return;
    }

    const result = cart.addItem(variant.id, 1, {
      slug: product.slug,
      name: product.name,
      brand: product.brand?.name,
      size: variant.size?.name ?? null,
      thumbnail_url: primaryImage?.image_url ?? product.images?.[0]?.image_url ?? null,
      list_price: product.list_price,
      sale_price: product.sale_price,
      availability: variant.availability ?? product.availability,
    });

    if (!result.ok) {
      setError(
        result.error === 'too_many_items'
          ? `Tu carrito admite hasta ${result.limit} productos distintos.`
          : 'Cantidad inválida.',
      );
    } else {
      setAdded(true);
    }
  };

  if (isLoading) return <LoadingState message="Cargando producto…" />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!product) return <EmptyState title="Producto no encontrado" />;

  return (
    <Page
      breadcrumbs={[
        { label: 'Inicio', to: '/' },
        { label: 'Catálogo', to: '/catalogo' },
        // La categoría principal enlaza al catálogo filtrado por ella: es la
        // navegación real, aunque esa URL no se indexe (§17.3).
        ...(product.primary_category
          ? [
              {
                label: product.primary_category.name,
                to: `/catalogo?category=${product.primary_category.slug}`,
              },
            ]
          : []),
        { label: product.name },
      ]}
    >
      <div className="row g-4">
        <div className="col-12 col-md-6">
          <ProductGallery images={product.images ?? []} productName={product.name} />
        </div>

        <div className="col-12 col-md-6">
          <p className="text-muted mb-1">{product.brand?.name}</p>
          <h1 className="mb-3">{product.name}</h1>

          <div className="mb-3">
            <PriceBadge
              listPrice={product.list_price}
              salePrice={product.sale_price}
              discountPercentage={product.discount_percentage}
              size="lg"
            />
          </div>

          <div className="d-flex flex-wrap gap-2 mb-3">
            <AvailabilityBadge availability={product.availability} />
            {product.is_new && <Tag variant="ink">Nuevo</Tag>}
            {product.is_featured && <Tag variant="accent">Destacado</Tag>}
          </div>

          {product.description && <p className="text-muted">{product.description}</p>}

          <VariantSelector
            sizes={product.sizes ?? []}
            variants={product.variants ?? []}
            selectedVariant={selectedVariant}
            onChange={setSelectedVariant}
            error={error}
          />

          <button
            type="button"
            className="btn btn-primary btn-lg w-100 mb-2"
            onClick={handleAddToCart}
            disabled={availabilityForCart === 'out_of_stock'}
          >
            {availabilityForCart === 'out_of_stock' ? 'No disponible' : 'Agregar al carrito'}
          </button>

          {added && (
            <div className="alert alert-success py-2" role="status">
              Producto agregado.{' '}
              <Link to="/carrito" className="alert-link">
                Ver carrito
              </Link>
            </div>
          )}

          <div className="mt-4">
            <p className="small text-muted mb-1">
              <strong>Categoría:</strong> {product.primary_category?.name}
            </p>
            {product.sports?.length > 0 && (
              <p className="small text-muted mb-1">
                <strong>Deporte:</strong> {product.sports.map((s) => s.name).join(', ')}
              </p>
            )}
            {product.gender && (
              <p className="small text-muted mb-0">
                <strong>Sexo:</strong> {translateGender(product.gender.name)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
