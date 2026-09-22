/**
 * Conversión entre el DTO y el formulario, y validación de entrada.
 *
 * Se separa de los componentes porque es lógica pura: así se puede probar sin
 * montar React, que es lo único que este proyecto puede testear hoy.
 *
 * La validación replica lo que `store_setting_schemas.parse_store_settings` ya
 * exige, para avisar antes de la petición. **No** añade reglas: el servidor
 * sigue siendo quien decide.
 */

import { safeExternalHref } from '../../../../shared/utils/safeLink.js';

// 04_BASE_DATOS.md §9.2.14, replicado en el schema del backend.
export const MAX_STORE_NAME_LENGTH = 255;
export const MAX_WHATSAPP_LENGTH = 50;
// 04 §9.2.14 (v1.1.0).
export const MAX_EMAIL_LENGTH = 255;
export const MAX_ABOUT_TITLE_LENGTH = 255;

// 01_ANALISIS_NEGOCIO.md §12.1: las dos marcadas como obligatorias (`RN-60`).
// §12.2 no declara ninguna obligatoria para la plantilla de ítem.
export const REQUIRED_MESSAGE_VARIABLES = ['items', 'total'];

/**
 * `social_links` es un objeto libre (`JSONB` sin esquema interno). El formulario
 * lo edita como filas nombre → enlace para no fijar un conjunto de redes que el
 * contrato no fija.
 */
function socialLinksToRows(socialLinks) {
  return Object.entries(socialLinks ?? {}).map(([name, url]) => ({
    name,
    url: typeof url === 'string' ? url : '',
  }));
}

/** Estado inicial del formulario a partir de un `StoreSettingsAdminDTO`. */
export function toFormValues(settings) {
  return {
    store_name: settings?.store_name ?? '',
    whatsapp_number: settings?.whatsapp_number ?? '',
    email: settings?.email ?? '',
    address: settings?.address ?? '',
    business_hours: settings?.business_hours ?? '',
    socialLinks: socialLinksToRows(settings?.social_links),
    about_title: settings?.about_title ?? '',
    about_text: settings?.about_text ?? '',
    message_template: settings?.message_template ?? '',
    item_template: settings?.item_template ?? '',
    featured_products_count: String(settings?.featured_products_count ?? ''),
  };
}

/**
 * ¿El enlace de una red es utilizable?
 *
 * A diferencia del enlace de un banner, este se abre hacia afuera: solo se
 * admite una URL absoluta `http`/`https`, nunca una ruta interna. Esa distinción
 * es lo único propio de acá; la regla de esquemas la resuelve
 * `safeExternalHref`, en el mismo módulo que usa la tienda.
 */
export function isValidUrl(valor) {
  return safeExternalHref(valor) !== null;
}

/**
 * ¿El correo tiene forma de correo?
 *
 * Comprobación deliberadamente laxa: el backend solo acota la longitud, y una
 * expresión estricta rechaza direcciones válidas. Acá solo se atajan los
 * errores de tipeo evidentes.
 */
export function isValidEmail(valor) {
  const correo = valor?.trim();
  if (!correo) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/** ¿La plantilla contiene todas las variables obligatorias? Devuelve las que faltan. */
export function missingVariables(plantilla, requeridas = REQUIRED_MESSAGE_VARIABLES) {
  return requeridas.filter((nombre) => !(plantilla ?? '').includes(`{{${nombre}}}`));
}

/**
 * Valida el formulario. Devuelve `{ campo: mensaje }`, vacío si todo está bien.
 *
 * `includeTemplates` en `false` omite las plantillas de WhatsApp: la pantalla de
 * Configuración las **envía** pero no las edita —§14.7 no las lista, §14.8 les
 * da pantalla propia—, y validarlas allí podría bloquear el guardado por un
 * campo que el administrador no ve ni puede corregir.
 */
export function validate(values, { includeTemplates = true } = {}) {
  const errores = {};

  const nombre = values.store_name?.trim();
  if (!nombre) {
    errores.store_name = 'El nombre de la tienda es obligatorio.';
  } else if (nombre.length > MAX_STORE_NAME_LENGTH) {
    errores.store_name = `No puede superar los ${MAX_STORE_NAME_LENGTH} caracteres.`;
  }

  const whatsapp = values.whatsapp_number?.trim();
  if (!whatsapp) {
    errores.whatsapp_number = 'El número de WhatsApp es obligatorio.';
  } else if (whatsapp.length > MAX_WHATSAPP_LENGTH) {
    errores.whatsapp_number = `No puede superar los ${MAX_WHATSAPP_LENGTH} caracteres.`;
  }

  // Contenido institucional (v1.1.0). Todo opcional: sin él, el catálogo
  // simplemente no publica la sección.
  const correo = values.email?.trim();
  if (correo) {
    if (correo.length > MAX_EMAIL_LENGTH) {
      errores.email = `No puede superar los ${MAX_EMAIL_LENGTH} caracteres.`;
    } else if (!isValidEmail(correo)) {
      errores.email = 'Ingresá un correo válido, por ejemplo hola@tienda.com.';
    }
  }

  if ((values.about_title?.trim().length ?? 0) > MAX_ABOUT_TITLE_LENGTH) {
    errores.about_title = `No puede superar los ${MAX_ABOUT_TITLE_LENGTH} caracteres.`;
  }

  // El texto sin título quedaría sin encabezado en la portada.
  if (values.about_text?.trim() && !values.about_title?.trim()) {
    errores.about_title = 'Poné un título para la sección de historia.';
  }

  // `RN-60`: las variables obligatorias se validan antes de guardar.
  if (includeTemplates) {
    if (!values.message_template?.trim()) {
      errores.message_template = 'La plantilla del mensaje es obligatoria.';
    } else {
      const faltantes = missingVariables(values.message_template);
      if (faltantes.length > 0) {
        errores.message_template = `Faltan variables obligatorias: ${faltantes
          .map((nombre) => `{{${nombre}}}`)
          .join(', ')}.`;
      }
    }

    if (!values.item_template?.trim()) {
      errores.item_template = 'La plantilla de ítem es obligatoria.';
    }
  }

  // 04 §9.2.14: `CHECK (featured_products_count > 0)`.
  const destacados = values.featured_products_count?.toString().trim();
  if (!destacados) {
    errores.featured_products_count = 'La cantidad de destacados es obligatoria.';
  } else if (!/^\d+$/.test(destacados) || Number.parseInt(destacados, 10) < 1) {
    errores.featured_products_count = 'Debe ser un número entero mayor que cero.';
  }

  // Solo se validan las filas con algo cargado: una fila en blanco se descarta
  // al armar el payload, no se reporta como error.
  const redes = {};
  (values.socialLinks ?? []).forEach((fila, indice) => {
    const clave = fila.name?.trim();
    const enlace = fila.url?.trim();
    if (!clave && !enlace) return;

    if (!clave) {
      redes[indice] = 'Indicá el nombre de la red.';
    } else if (!enlace) {
      redes[indice] = 'Indicá el enlace.';
    } else if (!isValidUrl(enlace)) {
      redes[indice] = 'Ingresá una URL completa (https://…).';
    }
  });
  if (Object.keys(redes).length > 0) errores.socialLinks = redes;

  return errores;
}

/**
 * Arma el cuerpo del `PUT` (§9.12).
 *
 * Los opcionales vacíos **se omiten** en lugar de viajar como cadena vacía. El
 * `PUT` reemplaza el recurso completo, de modo que omitir un opcional que el
 * administrador borró es exactamente lo que se quiere: queda en `NULL`.
 */
export function toPayload(values) {
  const payload = {
    store_name: values.store_name.trim(),
    whatsapp_number: values.whatsapp_number.trim(),
    // Las plantillas no se recortan: los saltos y espacios son parte del
    // formato del mensaje que se envía por WhatsApp.
    message_template: values.message_template,
    item_template: values.item_template,
    featured_products_count: Number.parseInt(values.featured_products_count, 10),
  };

  const correo = values.email?.trim();
  if (correo) payload.email = correo;

  const tituloHistoria = values.about_title?.trim();
  if (tituloHistoria) payload.about_title = tituloHistoria;

  // El texto **no** se recorta: los saltos de línea son parte de la redacción.
  if (values.about_text?.trim()) payload.about_text = values.about_text;

  const direccion = values.address?.trim();
  if (direccion) payload.address = direccion;

  const horarios = values.business_hours?.trim();
  if (horarios) payload.business_hours = horarios;

  const redes = {};
  (values.socialLinks ?? []).forEach((fila) => {
    const clave = fila.name?.trim();
    const enlace = fila.url?.trim();
    if (clave && enlace) redes[clave] = enlace;
  });
  if (Object.keys(redes).length > 0) payload.social_links = redes;

  return payload;
}

/**
 * ¿Hay cambios sin guardar?
 *
 * Se comparan los payloads y no los estados del formulario: así un espacio al
 * final o una fila de red en blanco —que no se envían— no cuentan como cambio.
 */
export function isDirty(values, initialValues) {
  return JSON.stringify(toPayload(values)) !== JSON.stringify(toPayload(initialValues));
}
