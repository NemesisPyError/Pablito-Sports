import styles from './TrustBar.module.css';

/**
 * Franja de confianza (08_UI_SYSTEM.md §14.1).
 *
 * Cuatro mensajes fijos, no administrables: a diferencia de banners o
 * historia, esto no varía por campaña. Ningún mensaje promete algo que el
 * negocio no ofrece hoy — en particular, ninguno asume checkout ni cuenta de
 * cliente, que no existen (`01_ANALISIS_NEGOCIO.md`).
 */
const ITEMS = [
  {
    icon: 'truck',
    title: 'Envíos a todo el país',
    text: 'Rápidos y seguros',
  },
  {
    icon: 'card',
    title: 'Hasta 12 cuotas sin interés',
    text: 'Con tarjetas participantes',
  },
  {
    icon: 'exchange',
    title: 'Cambios fáciles',
    text: 'Sin complicaciones',
  },
  {
    icon: 'chat',
    title: 'Atención personalizada',
    text: 'Te asesoramos por WhatsApp',
  },
];

/** §8: glifos del sistema como SVG en línea, mientras no exista biblioteca. */
function Icon({ name }) {
  const paths = {
    truck:
      'M3 4h11v10H3zM14 8h4l3 3v3h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    card: 'M3 6h18v12H3zM3 10h18M7 14h4',
    exchange: 'M4 7h13l-3-3M20 17H7l3 3',
    chat: 'M4 5h16v11H8l-4 4z',
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function TrustBar() {
  return (
    <section className={styles.bar} aria-label="Beneficios de comprar en Pablito Sports">
      <div className={styles.inner}>
        {ITEMS.map((item) => (
          <div className={styles.item} key={item.title}>
            <Icon name={item.icon} />
            <div>
              <p className={styles.title}>{item.title}</p>
              <p className={styles.text}>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
