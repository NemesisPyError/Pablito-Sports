import { Page } from '../../../shared/components/Page.jsx';
import { simpleWhatsAppHref } from '../../../shared/utils/whatsapp.js';
import { useStoreAbout } from '../hooks/useStoreAbout.js';

/**
 * Página de contacto.
 *
 * `RN-58`: el canal de consulta es el WhatsApp que configura el panel. El
 * correo llega por el recurso institucional (§7.2b) y solo se muestra si está
 * cargado.
 */
export function ContactPage({ storeSettings }) {
  const { data: historia } = useStoreAbout();

  return (
    <Page
      title="Contacto"
      eyebrow={storeSettings?.store_name ?? 'Pablito Sports'}
      breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Contacto' }]}
      narrow
    >
      {storeSettings?.whatsapp_number && (
        <p>
          <strong>WhatsApp:</strong>{' '}
          <a
            href={simpleWhatsAppHref(storeSettings.whatsapp_number)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {storeSettings.whatsapp_number}
          </a>
        </p>
      )}
      {storeSettings?.address && (
        <p>
          <strong>Dirección:</strong> {storeSettings.address}
        </p>
      )}
      {storeSettings?.business_hours && (
        <p>
          <strong>Horario:</strong> {storeSettings.business_hours}
        </p>
      )}
      {historia?.email && (
        <p>
          <strong>Correo:</strong> <a href={`mailto:${historia.email}`}>{historia.email}</a>
        </p>
      )}
      <p>Podés escribirnos por WhatsApp o visitarnos en nuestro local.</p>
    </Page>
  );
}
