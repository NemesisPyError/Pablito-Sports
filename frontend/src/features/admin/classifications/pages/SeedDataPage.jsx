import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { translateGender, translateSizeType } from '../../../../shared/config/labels.js';
import { useSeedData } from '../hooks/useSeedData.js';

/**
 * Sexos y tipos de talle (05_API.md §9.17, §9.18).
 *
 * Pantalla de **consulta**: `S-06` y `S-07` los declaran datos semilla no
 * administrables, de modo que no hay botones de alta, edición ni baja. Se
 * muestran porque el administrador los elige al crear un producto y necesita
 * saber cuáles existen.
 *
 * Se presentan juntos y no en dos pantallas: son la misma clase de dato y por
 * separado cada una quedaría casi vacía.
 */
export function SeedDataPage() {
  const { genders, sizeTypes, isLoading, isError, refetch } = useSeedData();

  if (isLoading) return <LoadingState message="Cargando datos del sistema…" />;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar los datos del sistema"
        message="Revisá tu conexión e intentá de nuevo."
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <h2 className="h5 mb-1">Datos del sistema</h2>
      <p className="text-muted small mb-3">
        Sexos y tipos de talle son datos fijos del sistema: se consultan, no se editan. Cambiarlos
        exige una migración.
      </p>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <Tabla titulo="Sexos" items={genders} traducir={translateGender} />
        </div>
        <div className="col-12 col-lg-6">
          <Tabla titulo="Tipos de talle" items={sizeTypes} traducir={translateSizeType} />
        </div>
      </div>
    </>
  );
}

/** `traducir(slug)`: presentación en español (v1.4.0). El slug interno no cambia. */
function Tabla({ titulo, items, traducir }) {
  return (
    <section className="card h-100">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <h3 className="h6 mb-0">{titulo}</h3>
        <span className="badge text-bg-light border">{items.length}</span>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Slug</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{traducir(item.slug)}</td>
                <td className="small text-muted">
                  <code>{item.slug}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
