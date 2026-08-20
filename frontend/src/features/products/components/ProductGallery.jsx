import { useState } from 'react';

import { Image } from '../../../shared/components/Image.jsx';
import styles from './ProductGallery.module.css';

/**
 * Galería de imágenes de producto.
 *
 * Muestra imagen principal y miniaturas; sin lightbox en v1 (COMPP-03).
 */
export function ProductGallery({ images, productName }) {
  const sortedImages = [...images].sort((a, b) => a.position - b.position);
  const primary = sortedImages.find((image) => image.is_primary) ?? sortedImages[0];
  const [selected, setSelected] = useState(primary);

  if (sortedImages.length === 0) {
    return (
      <Image
        src={null}
        alt={productName}
        className="w-100 rounded"
        aspectRatio="1 / 1"
        lazy={false}
      />
    );
  }

  return (
    <div>
      <Image
        src={selected?.image_url}
        alt={selected?.alt_text || productName}
        className="w-100 rounded border mb-2"
        aspectRatio="1 / 1"
        lazy={false}
      />

      {sortedImages.length > 1 && (
        <div
          className="d-flex gap-2 overflow-auto pb-2"
          role="list"
          aria-label="Miniaturas del producto"
        >
          {sortedImages.map((image) => (
            <button
              key={image.id}
              type="button"
              className={`btn p-0 border rounded overflow-hidden ${styles.thumbnail} ${selected?.id === image.id ? 'border-primary border-2' : ''}`}
              onClick={() => setSelected(image)}
              aria-label={image.alt_text || `Ver imagen ${image.position + 1}`}
              aria-current={selected?.id === image.id ? 'true' : undefined}
            >
              <Image
                src={image.image_url}
                alt={image.alt_text || `${productName} ${image.position + 1}`}
                className="w-100 h-100"
                aspectRatio="1 / 1"
                objectFit="cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
