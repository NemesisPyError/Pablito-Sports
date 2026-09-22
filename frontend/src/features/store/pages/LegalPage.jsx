import { Page } from '../../../shared/components/Page.jsx';
import { simplePageMeta } from '../../../shared/seo/pageMeta.js';
import { useDocumentMeta } from '../../../shared/seo/useDocumentMeta.js';
import { useStoreAbout } from '../hooks/useStoreAbout.js';
import { buildLegalData, LEGAL_EFFECTIVE_DATE, LEGAL_PAGES } from '../legal/legalContent.js';
import styles from './LegalPage.module.css';

/**
 * Páginas legales del pie: Términos, Privacidad, Envío y Reembolso, y
 * Preguntas frecuentes (09_COMPONENTES.md §9.8 `PublicFooter`).
 *
 * Reemplaza a `LegalPlaceholderPage`, que existía mientras el cliente no
 * aprobaba los textos. Un solo componente para las cuatro: el contenido vive en
 * `legal/legalContent.js` y acá solo se dibuja.
 */
export function LegalPage({ pagina, storeSettings }) {
  const contenido = LEGAL_PAGES[pagina];
  // El correo no está en la configuración pública (`AD-12`): viene con la
  // historia de la tienda. Si todavía no cargó, su fila simplemente no aparece.
  const { data: historia } = useStoreAbout();

  useDocumentMeta(
    simplePageMeta(contenido?.title ?? 'Información', contenido?.description ?? '', storeSettings),
    storeSettings,
  );

  if (!contenido) return null;

  const datos = buildLegalData(storeSettings, historia);

  return (
    <Page
      title={contenido.title}
      eyebrow={`Vigente desde el ${LEGAL_EFFECTIVE_DATE}`}
      breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: contenido.title }]}
      narrow
    >
      <div className={styles.document}>
        {contenido.sections(datos).map((bloque, indice) => (
          // El índice es estable: la lista sale de un texto fijo y no se
          // reordena ni filtra entre renders.
          <Bloque key={indice} bloque={bloque} />
        ))}
      </div>
    </Page>
  );
}

/** Texto con tramos en negrita: `'texto'` o `['texto', { b: 'negrita' }]`. */
function Texto({ valor }) {
  if (!Array.isArray(valor)) return valor;
  return valor.map((tramo, indice) =>
    typeof tramo === 'string' ? tramo : <strong key={indice}>{tramo.b}</strong>,
  );
}

function Valor({ valor }) {
  if (valor && typeof valor === 'object' && valor.href) {
    return (
      <a href={valor.href} target="_blank" rel="noopener noreferrer">
        {valor.label}
      </a>
    );
  }
  return valor;
}

function Bloque({ bloque }) {
  if (bloque.h) return <h2 className={styles.h2}>{bloque.h}</h2>;
  if (bloque.h3) return <h3 className={styles.h3}>{bloque.h3}</h3>;
  if (bloque.p) {
    return (
      <p>
        <Texto valor={bloque.p} />
      </p>
    );
  }

  if (bloque.note) {
    return (
      <p className={styles.note}>
        <Texto valor={bloque.note} />
      </p>
    );
  }

  if (bloque.ul || bloque.ol) {
    const Lista = bloque.ul ? 'ul' : 'ol';
    return (
      <Lista className={styles.list}>
        {(bloque.ul ?? bloque.ol).map((item, indice) => (
          <li key={indice}>
            <Texto valor={item} />
          </li>
        ))}
      </Lista>
    );
  }

  if (bloque.kv) {
    // Una fila sin valor no se dibuja: publicar «[Completar]» o una celda
    // vacía en una página legal sería peor que omitirla.
    const filas = bloque.kv.filter(([, valor]) => valor);
    return (
      <dl className={styles.facts}>
        {filas.map(([clave, valor]) => (
          <div key={clave} className={styles.fact}>
            <dt>{clave}</dt>
            <dd>
              <Valor valor={valor} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (bloque.table) {
    return (
      <div className={styles.tableWrap}>
        <table className={`table ${styles.table}`}>
          <thead>
            <tr>
              {bloque.table.head.map((celda) => (
                <th key={celda} scope="col">
                  {celda}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloque.table.rows.map((fila) => (
              <tr key={fila[0]}>
                {fila.map((celda, indice) => (
                  <td key={indice}>{celda}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}
