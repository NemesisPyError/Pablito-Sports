import { Image } from '../../../shared/components/Image.jsx';
import { Page } from '../../../shared/components/Page.jsx';
import { useStoreAbout } from '../hooks/useStoreAbout.js';

/**
 * Página institucional de la tienda.
 *
 * El texto sale de `/store/about` (§7.2b), no del código: es contenido que el
 * administrador edita desde el panel. Antes estaba escrito en este archivo, de
 * modo que cambiarlo exigía un despliegue.
 *
 * Sin contenido cargado, la página sigue siendo útil: muestra los datos de
 * contacto de la tienda, que sí existen siempre.
 */
export function AboutPage({ storeSettings }) {
  const { data: historia } = useStoreAbout();

  const nombre = storeSettings?.store_name ?? 'Pablito Sports';

  return (
    <Page
      title={historia?.about_title || 'Nosotros'}
      eyebrow={nombre}
      lead={historia?.about_text}
      breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Nosotros' }]}
      narrow
    >
      {historia?.about_image_url && (
        <Image
          src={historia.about_image_url}
          alt=""
          aspectRatio="16 / 9"
          objectFit="cover"
          className="mb-4"
        />
      )}

      <dl className="row">
        {storeSettings?.address && (
          <>
            <dt className="col-12 col-sm-3">Dirección</dt>
            <dd className="col-12 col-sm-9">{storeSettings.address}</dd>
          </>
        )}
        {storeSettings?.business_hours && (
          <>
            <dt className="col-12 col-sm-3">Horarios</dt>
            <dd className="col-12 col-sm-9">{storeSettings.business_hours}</dd>
          </>
        )}
        {storeSettings?.whatsapp_number && (
          <>
            <dt className="col-12 col-sm-3">WhatsApp</dt>
            <dd className="col-12 col-sm-9">{storeSettings.whatsapp_number}</dd>
          </>
        )}
      </dl>
    </Page>
  );
}
