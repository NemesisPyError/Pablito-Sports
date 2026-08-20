import { Carousel } from '../../../shared/components/Carousel.jsx';
import { Section } from '../../../shared/components/Section.jsx';
import { SectionHeader } from '../../../shared/components/SectionHeader.jsx';
import { useProducts } from '../hooks/useProducts.js';
import { ProductCard } from './ProductCard.jsx';

/**
 * Carril compacto de productos (09_COMPONENTES.md §9.8 `ProductRail`).
 *
 * Una sección vacía **no deja encabezado suelto**: si la consulta no devuelve
 * nada, no se dibuja nada. La portada prefiere una sección menos a un título
 * sobre un vacío.
 *
 * `products` permite pasar un listado ya cargado —el caso de los destacados,
 * que tienen su propio hook porque el servidor decide cuántos son—. En el
 * resto, la consulta viaja en `query`.
 */
export function ProductRail({ id, eyebrow, title, href, query, products, tone = 'default' }) {
  // El hook siempre se llama: React exige un orden estable de hooks. `enabled`
  // es lo que evita la petición cuando el listado ya vino dado.
  const consulta = useProducts(query ?? {}, { enabled: Boolean(query) && !products });
  const listado = products ?? consulta.data?.products ?? [];

  if (listado.length === 0) return null;

  return (
    <Section labelledBy={id} tone={tone}>
      <SectionHeader id={id} eyebrow={eyebrow} title={title} href={href} />

      <Carousel label={title} metric="products" bleed>
        {listado.map((product) => (
          <ProductCard key={product.slug} product={product} variant="rail" />
        ))}
      </Carousel>
    </Section>
  );
}
