import { ErrorState } from '../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../shared/components/LoadingState.jsx';
import { homeMeta } from '../../../shared/seo/pageMeta.js';
import { useDocumentMeta } from '../../../shared/seo/useDocumentMeta.js';
import { usePreloadImage } from '../../../shared/seo/usePreloadImage.js';
import { ProductRail } from '../../catalog/components/ProductRail.jsx';
import { BannerRail } from '../components/BannerRail.jsx';
import { BrandShowcase } from '../components/BrandShowcase.jsx';
import { Hero } from '../components/Hero.jsx';
import { StoryBlock } from '../components/StoryBlock.jsx';
import { TrustBar } from '../components/TrustBar.jsx';
import { useBanners } from '../hooks/useBanners.js';
import { useBrandShowcases } from '../hooks/useBrandShowcases.js';
import { useFeaturedProducts } from '../hooks/useFeaturedProducts.js';
import { catalogHref } from '../utils/navAxes.js';

/**
 * Portada del catálogo (08_UI_SYSTEM.md §14.1).
 *
 * El orden es comercial, no técnico: campaña, novedades, curaduría del dueño,
 * marcas y ofertas. **Toda sección sin datos desaparece por completo**, sin
 * dejar encabezado suelto; por eso cada bloque decide por su cuenta si se
 * dibuja y la portada solo los ordena.
 */
export function HomePage({ storeSettings }) {
  // §7.2: cada zona es una consulta propia. El hero se pide acá porque su
  // imagen es el LCP y hay que precargarla desde la página.
  const bannersQuery = useBanners('hero');
  // Sin límite: lo fija `featured_products_count` desde el panel (`RF-35`).
  const featuredQuery = useFeaturedProducts();
  const showcasesQuery = useBrandShowcases();

  // La zona llega ordenada por `position`: la primera es la que el
  // administrador puso adelante.
  const heroBanner = bannersQuery.data?.[0] ?? null;

  useDocumentMeta(homeMeta(storeSettings), storeSettings);
  // El banner de portada es el LCP de esta pantalla.
  usePreloadImage(heroBanner?.image_url);

  const isLoading = bannersQuery.isLoading || featuredQuery.isLoading;
  // Solo se corta la portada si **todo** falló. Que una sección no cargue no
  // justifica esconder el resto de la tienda.
  const isError = bannersQuery.isError && featuredQuery.isError;

  if (isLoading) return <LoadingState message="Cargando tienda…" />;
  if (isError)
    return (
      <ErrorState
        onRetry={() => {
          bannersQuery.refetch();
          featuredQuery.refetch();
        }}
      />
    );

  return (
    <>
      {/* §10.6: un solo `h1`, con la identidad de la tienda. El titular grande
          de la portada es el del hero, que es contenido administrable y por
          tanto no puede ser el encabezado de la página. */}
      <h1 className="visually-hidden">
        {storeSettings?.store_name ?? 'Pablito Sports'} · Indumentaria y calzado deportivo
      </h1>

      <Hero banner={heroBanner} />

      <BannerRail
        id="portada-novedades"
        eyebrow="Lo último"
        title="Novedades"
        placement="news"
        href={catalogHref({ isNew: true })}
        tone="inverse"
      />

      <ProductRail
        id="portada-destacados"
        eyebrow="Selección de la tienda"
        title="Destacados"
        href="/catalogo"
        products={featuredQuery.data ?? []}
      />

      {/* Un bloque por marca destacada, en el orden que fija `home_position`. */}
      {(showcasesQuery.data ?? []).map((showcase) => (
        <BrandShowcase key={showcase.slug} showcase={showcase} />
      ))}

      <ProductRail
        id="portada-promociones"
        eyebrow="Precios rebajados"
        title="Promociones"
        href={catalogHref({ onSale: true })}
        query={{ on_sale: true }}
        tone="inverse"
      />

      <BannerRail
        id="portada-campanas"
        eyebrow="Campañas"
        title="Ofertas destacadas"
        placement="promo"
        href={catalogHref({ onSale: true })}
        tone="inverse"
      />

      <TrustBar />

      <StoryBlock storeSettings={storeSettings} />
    </>
  );
}
