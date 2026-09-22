/**
 * Textos legales de la tienda, aprobados por el cliente (11/09/2026).
 *
 * Salen del documento «Pablito Sports — Políticas y condiciones» v1.0
 * (`docs/legal/Pablito_Sports_Politicas_Legales.pdf`). Los anexos del PDF —datos
 * a completar y nota sobre la revisión legal— son internos y **no** se publican.
 *
 * Son textos fijos, como `TrustBar`: no hay endpoint ni panel para editarlos, y
 * cambiarlos exige un despliegue. Lo que sí es variable —WhatsApp, dirección,
 * horario, redes, correo— llega en `datos` desde la configuración de la tienda,
 * para que un cambio en el panel no deje estas páginas desactualizadas.
 *
 * Cada sección es una lista de bloques que `LegalPage` sabe dibujar:
 *
 *   { h: 'Título' }                     encabezado de sección (h2)
 *   { h3: 'Subtítulo' }                 encabezado de apartado (h3)
 *   { p: 'Texto' }                      párrafo; admite [ 'texto', { b: 'negrita' } ]
 *   { ul: [...] } / { ol: [...] }        listas
 *   { note: 'Texto' }                   aviso destacado
 *   { table: { head, rows } }           tabla
 *   { kv: [[clave, valor], ...] }       ficha clave/valor; el valor puede ser
 *                                       { href, label } y las filas sin valor
 *                                       se omiten
 */

/**
 * Datos del titular que **no** existen en ningún otro lado del sistema.
 *
 * Es el único lugar a completar. Mientras un valor sea `null`, su fila no se
 * muestra: publicar «[Completar RUC]» en una página legal sería peor que
 * omitir la fila. La Ley N.º 4.868/13 de Comercio Electrónico pide que el
 * proveedor se identifique con razón social y RUC.
 */
export const LEGAL_ENTITY = {
  razonSocial: 'Pablito Sports',
  ruc: '4357800-4',
  // Correo de respaldo: el que cargue el administrador en el panel (historia de
  // la tienda) tiene prioridad, ver `buildLegalData`.
  email: 'pablo.caballeroirala@gmail.com',
  // Días que se reserva un pedido para retiro en el local. Sin valor, la
  // política no promete un plazo que la tienda no confirmó.
  diasReservaRetiro: null,
};

export const LEGAL_EFFECTIVE_DATE = '9 de septiembre de 2026';

const LEY_CONSUMIDOR = 'Ley N.º 1.334/98 de Defensa del Consumidor y del Usuario';

/** Ficha de contacto, compartida por Términos y Preguntas frecuentes. */
function contacto(datos) {
  return [
    { h: 'Canales de contacto y reclamos' },
    {
      p: 'Para consultas, ejercicio de derechos sobre datos personales, cambios, garantías o reclamos, podés comunicarte por cualquiera de estos medios:',
    },
    {
      kv: [
        ['WhatsApp', datos.whatsapp && `${datos.whatsapp} (canal principal de atención)`],
        ['Correo electrónico', datos.email],
        ['Local comercial', datos.direccion],
        ['Horario', datos.horario],
        ['Instagram', datos.instagram && { href: datos.instagram, label: datos.instagram }],
        ['Facebook', datos.facebook && { href: datos.facebook, label: datos.facebook }],
      ],
    },
    {
      p: [
        'Todo reclamo se responde dentro de los ',
        { b: 'cinco (5) días hábiles' },
        '. Si no obtenés una respuesta satisfactoria, podés acudir a la ',
        { b: 'Secretaría Nacional de Defensa del Consumidor y del Usuario (SEDECO)' },
        ', autoridad de aplicación de la Ley N.º 1.334/98 en la República del Paraguay.',
      ],
    },
  ];
}

const TERMINOS = {
  title: 'Términos del Servicio',
  description:
    'Términos y condiciones de uso del sitio de Pablito Sports: catálogo digital con consulta por WhatsApp, precios de referencia, stock y legislación aplicable.',
  sections: (datos) => [
    { h: 'Datos del titular del sitio' },
    {
      p: `El sitio web de ${datos.tienda} es operado por el titular identificado a continuación, en adelante indistintamente «${datos.tienda}», «la Tienda» o «nosotros». El usuario o visitante del sitio será denominado «el Cliente» o «el Usuario».`,
    },
    {
      kv: [
        ['Nombre comercial', datos.tienda],
        ['Razón social', datos.razonSocial],
        ['RUC', datos.ruc],
        ['Domicilio comercial', datos.direccion],
        ['Sucursales', 'Única sucursal (local físico)'],
        ['WhatsApp', datos.whatsapp],
        ['Correo electrónico', datos.email],
        ['Horario de atención', datos.horario],
      ],
    },

    { h: 'Naturaleza del servicio: catálogo con consulta por WhatsApp' },
    {
      p: 'Es fundamental que el Usuario comprenda, antes de utilizar el sitio, cuál es el alcance real del servicio que la Tienda ofrece a través de esta plataforma.',
    },
    {
      note: [
        { b: 'Este sitio es un catálogo digital, no una tienda con pago en línea.' },
        ' El sitio permite explorar los artículos disponibles, ver precios de referencia, filtrar por marca, categoría, deporte, género y talle, y armar un carrito de consulta. Al finalizar, el Usuario envía esa consulta por WhatsApp a la Tienda. ',
        {
          b: 'El sitio no procesa pagos, no cobra, no reserva stock y no perfecciona ninguna compra.',
        },
        ' Toda operación se acuerda, se abona y se entrega por fuera del sitio: por WhatsApp o presencialmente en el local.',
      ],
    },
    { h3: 'Qué hace el sitio' },
    {
      ul: [
        'Exhibe el catálogo de productos con fotografías, descripciones, talles y precios de referencia.',
        'Permite filtrar y buscar artículos.',
        'Permite armar una lista de consulta (carrito) que queda guardada únicamente en el navegador del Usuario.',
        'Genera un mensaje de WhatsApp con esa lista para enviarlo a la Tienda.',
      ],
    },
    { h3: 'Qué no hace el sitio' },
    {
      ul: [
        'No procesa pagos ni almacena datos de tarjetas o cuentas bancarias.',
        'No requiere ni permite crear cuentas de cliente ni contraseñas.',
        'No reserva ni bloquea mercadería: agregar un artículo al carrito de consulta no garantiza su disponibilidad.',
        'No confirma la existencia real de stock ni el precio final: ambos se confirman por WhatsApp o en el local.',
        'No emite comprobantes ni factura de forma automática.',
      ],
    },

    { h: 'Términos y condiciones de uso' },
    { h3: 'Objeto y aceptación' },
    {
      p: 'Los presentes términos y condiciones regulan el acceso y la utilización del sitio web de la Tienda. El solo acceso al sitio, la navegación por el catálogo o el envío de una consulta por WhatsApp implican la aceptación plena y sin reservas de estas condiciones. Si el Usuario no está de acuerdo con alguna de ellas, debe abstenerse de utilizar el sitio.',
    },
    { h3: 'Capacidad' },
    {
      p: 'El sitio está dirigido a personas mayores de dieciocho (18) años con capacidad legal para contratar. Los menores de edad podrán navegar el catálogo, pero cualquier consulta u operación comercial deberá ser realizada por su padre, madre, tutor o representante legal, quien asume la responsabilidad de la misma.',
    },
    { h3: 'Precios de referencia' },
    {
      p: [
        'Los precios publicados se expresan en ',
        { b: 'guaraníes (Gs.)' },
        ' e incluyen el Impuesto al Valor Agregado (IVA) cuando corresponda. Los precios son de carácter ',
        { b: 'referencial' },
        ' y están sujetos a confirmación por parte de la Tienda al momento de responder la consulta. La Tienda se reserva el derecho de modificar los precios en cualquier momento y sin previo aviso, sin que ello afecte a operaciones ya confirmadas por escrito.',
      ],
    },
    {
      p: [
        'En caso de detectarse un ',
        { b: 'error material evidente' },
        ' en un precio publicado —por error de carga, tipográfico o de sistema— la Tienda podrá negarse a concretar la operación a ese valor, informando la situación al Cliente antes de cualquier pago. Si el Cliente ya hubiera abonado, se le reintegrará íntegramente el importe.',
      ],
    },
    { h3: 'Disponibilidad y stock' },
    {
      p: 'La publicación de un artículo en el catálogo no constituye una oferta vinculante ni garantiza su disponibilidad inmediata. La existencia efectiva del producto, del color y del talle solicitados se confirma únicamente al responder la consulta. Ante la falta de stock, la Tienda lo informará y podrá proponer una alternativa equivalente, sin que ello genere derecho a indemnización alguna.',
    },
    { h3: 'Imágenes y descripciones' },
    {
      p: 'Las fotografías son ilustrativas. Pueden existir variaciones menores de tonalidad derivadas de la iluminación, del proceso fotográfico o de la calibración de la pantalla del Usuario. La Tienda procura que las descripciones, medidas y composiciones sean exactas, pero no garantiza que estén libres de errores; ante cualquier duda el Cliente puede consultarlo por WhatsApp antes de concretar la operación.',
    },
    { h3: 'Promociones y descuentos' },
    {
      p: [
        'Las promociones y descuentos publicados tienen una vigencia determinada, se aplican únicamente a los artículos expresamente indicados y ',
        { b: 'no son acumulables entre sí' },
        ' salvo que se anuncie lo contrario. La Tienda podrá suspender o modificar una promoción en cualquier momento, respetando las operaciones ya confirmadas durante su vigencia.',
      ],
    },
    { h3: 'Proceso de consulta y perfeccionamiento de la operación' },
    {
      ol: [
        'El Cliente selecciona artículos, elige talle y cantidad y los agrega al carrito de consulta.',
        'El Cliente envía la consulta por WhatsApp desde el sitio. El mensaje contiene el detalle de los artículos y sus talles.',
        'Un vendedor de la Tienda responde confirmando disponibilidad, precio final, medios de pago y modalidad de entrega.',
        'La operación queda perfeccionada únicamente cuando ambas partes acuerdan expresamente esos términos por WhatsApp o en el local, y el Cliente abona en la forma convenida.',
      ],
    },
    {
      p: 'Hasta el último paso no existe contrato de compraventa alguno. El envío de una consulta no obliga al Cliente a comprar ni obliga a la Tienda a vender.',
    },
    { h3: 'Medios de pago y facturación' },
    {
      p: [
        'Los medios de pago aceptados se informan al responder la consulta y pueden incluir efectivo, transferencia bancaria, billetera electrónica y tarjetas de débito o crédito en el local. ',
        {
          b: 'La Tienda nunca solicita datos de tarjetas, claves ni contraseñas a través del sitio web.',
        },
        ' Por cada operación se emite el comprobante legal correspondiente conforme a la normativa tributaria vigente; el Cliente debe conservarlo, ya que es requisito para cualquier cambio, devolución o reclamo de garantía.',
      ],
    },
    { h3: 'Propiedad intelectual' },
    {
      p: 'El nombre, el logotipo, los textos, las fotografías propias, el diseño, el código fuente y demás elementos del sitio son propiedad de la Tienda o se utilizan bajo licencia. Las marcas de terceros que aparecen en el catálogo pertenecen a sus respectivos titulares y se exhiben con el único fin de identificar los productos comercializados. Queda prohibida su reproducción, distribución o modificación sin autorización escrita.',
    },
    { h3: 'Uso prohibido' },
    { p: 'El Usuario se obliga a no:' },
    {
      ul: [
        'Utilizar el sitio con fines ilícitos o contrarios a la buena fe.',
        'Extraer masivamente contenidos del catálogo mediante robots, scrapers o cualquier medio automatizado.',
        'Intentar vulnerar la seguridad del sitio, acceder a áreas restringidas o interferir en su funcionamiento.',
        'Suplantar la identidad de la Tienda o de terceros.',
        'Reproducir el catálogo, total o parcialmente, con fines comerciales.',
      ],
    },
    { h3: 'Disponibilidad del servicio' },
    {
      p: 'La Tienda procura mantener el sitio disponible de forma continua, pero no garantiza su funcionamiento ininterrumpido ni libre de errores. El servicio puede verse suspendido por tareas de mantenimiento, fallas técnicas o causas ajenas a la Tienda, sin que ello genere responsabilidad alguna.',
    },
    { h3: 'Limitación de responsabilidad' },
    {
      p: [
        'En la máxima medida permitida por la legislación paraguaya, la Tienda no responde por daños indirectos derivados del uso del sitio, de la imposibilidad de acceder a él, de la interrupción del servicio de WhatsApp o de la actuación de terceros ajenos a la Tienda. ',
        {
          b: `Ninguna cláusula de este documento limita los derechos que la ${LEY_CONSUMIDOR} reconoce al Cliente`,
        },
        ', ni la responsabilidad de la Tienda por los productos que comercializa.',
      ],
    },
    { h3: 'Modificación de estas condiciones' },
    {
      p: 'La Tienda podrá modificar estos términos en cualquier momento. La versión vigente será siempre la publicada en el sitio, con su fecha de actualización. Se recomienda al Usuario revisarlos periódicamente. Las operaciones ya confirmadas se rigen por la versión vigente al momento de su confirmación.',
    },
    { h3: 'Legislación aplicable y jurisdicción' },
    {
      p: `Estas condiciones se rigen por las leyes de la República del Paraguay, en particular la ${LEY_CONSUMIDOR}, la Ley N.º 4.868/13 de Comercio Electrónico y su Decreto Reglamentario N.º 1.165/14. Para toda controversia las partes se someten a los tribunales ordinarios de la ciudad de Encarnación, Departamento de Itapúa, sin perjuicio del derecho del consumidor de acudir a la autoridad de aplicación competente.`,
    },

    ...contacto(datos),
  ],
};

const PRIVACIDAD = {
  title: 'Política de Privacidad',
  description:
    'Cómo trata Pablito Sports los datos personales: el sitio no pide registro, qué datos se usan al consultar por WhatsApp, cookies y derechos del titular.',
  sections: (datos) => [
    { h: 'Política de privacidad y protección de datos' },
    { h3: 'Responsable del tratamiento' },
    {
      p: `El responsable del tratamiento de los datos personales es ${datos.tienda}${
        datos.direccion ? `, con domicilio en ${datos.direccion}` : ''
      }, con contacto a través de los canales indicados en los Términos del Servicio.`,
    },
    { h3: 'Principio general: el sitio no pide datos personales' },
    {
      note: [
        'Para navegar el catálogo y armar el carrito de consulta ',
        { b: 'no es necesario registrarse ni proporcionar ningún dato personal' },
        '. El sitio no tiene cuentas de cliente, no pide nombre, documento, dirección ni teléfono, y no almacena datos personales del visitante en sus servidores.',
      ],
    },
    { h3: 'Datos que sí se tratan' },
    {
      table: {
        head: ['Categoría', 'Qué incluye', 'Origen y finalidad'],
        rows: [
          [
            'Datos de la consulta por WhatsApp',
            'Número de teléfono, nombre de perfil y todo dato que el Cliente decida escribir en el chat (dirección de entrega, talle, preferencias).',
            'Los aporta voluntariamente el Cliente al iniciar el chat. Se usan para responder la consulta, coordinar la operación, la entrega y la posventa.',
          ],
          [
            'Datos técnicos de navegación',
            'Dirección IP, tipo de navegador y dispositivo, páginas visitadas, fecha y hora, registros del servidor.',
            'Se generan automáticamente al visitar el sitio. Se usan para seguridad, prevención de abusos y estadísticas agregadas de uso. No se emplean para identificar personas.',
          ],
          [
            'Carrito de consulta',
            'Lista de artículos, talles y cantidades seleccionados.',
            'Se guarda exclusivamente en el navegador del Usuario (almacenamiento local). No se envía ni se almacena en los servidores de la Tienda.',
          ],
          [
            'Datos de facturación',
            'Nombre o razón social, RUC o cédula, según corresponda.',
            'Solo si la operación se concreta. Se tratan para emitir el comprobante legal y cumplir las obligaciones tributarias.',
          ],
        ],
      },
    },
    { h3: 'Finalidades y base del tratamiento' },
    {
      p: [
        'Los datos se tratan únicamente para: (a) responder consultas y coordinar operaciones; (b) gestionar entregas, cambios, devoluciones y garantías; (c) cumplir obligaciones legales, tributarias y contables; y (d) mantener la seguridad del sitio. La base del tratamiento es el ',
        { b: 'consentimiento del Cliente' },
        ', manifestado al iniciar voluntariamente el contacto, la ',
        { b: 'ejecución de la relación comercial' },
        ' y el ',
        { b: 'cumplimiento de obligaciones legales' },
        '.',
      ],
    },
    { h3: 'Comunicaciones comerciales' },
    {
      p: 'La Tienda podrá enviar novedades, promociones o catálogos por WhatsApp únicamente a Clientes que lo hayan consentido. El Cliente puede solicitar en cualquier momento dejar de recibirlas escribiendo «BAJA» por el mismo canal, y la solicitud se atenderá sin costo ni demora injustificada.',
    },
    { h3: 'Con quién se comparten los datos' },
    {
      p: [
        'La Tienda ',
        { b: 'no vende, alquila ni cede datos personales a terceros con fines comerciales' },
        '. Los datos solo se comparten cuando resulta imprescindible, con:',
      ],
    },
    {
      ul: [
        [
          { b: 'WhatsApp (Meta Platforms).' },
          ' La conversación se desarrolla dentro de esa aplicación y queda sujeta además a las políticas propias de Meta, que la Tienda no controla.',
        ],
        [
          { b: 'Proveedor de alojamiento web y servicios de seguridad,' },
          ' que procesan datos técnicos por cuenta de la Tienda.',
        ],
        [
          { b: 'Empresas de transporte,' },
          ' cuando el Cliente solicita un envío: se les entregan únicamente los datos necesarios para la entrega.',
        ],
        [
          { b: 'Autoridades públicas competentes,' },
          ' cuando exista una obligación legal o un requerimiento judicial.',
        ],
      ],
    },
    { h3: 'Conservación' },
    {
      p: 'Las conversaciones de WhatsApp se conservan mientras exista relación comercial o interés legítimo en atender la posventa. Los datos de facturación se conservan por el plazo que exige la normativa tributaria paraguaya. Los registros técnicos del servidor se conservan por un período acotado y luego se eliminan o anonimizan.',
    },
    { h3: 'Seguridad' },
    {
      p: [
        'El sitio se sirve mediante conexión cifrada ',
        { b: 'HTTPS/TLS' },
        ' y cuenta con medidas técnicas y organizativas razonables para proteger la información: control de acceso al panel administrativo, contraseñas cifradas, registro de actividad y protección frente a abusos automatizados. Ningún sistema es absolutamente invulnerable, por lo que la Tienda no puede garantizar una seguridad total, aunque se compromete a actuar diligentemente ante cualquier incidente.',
      ],
    },
    { h3: 'Derechos del titular de los datos' },
    {
      p: [
        'El Cliente puede solicitar en cualquier momento el ',
        { b: 'acceso' },
        ' a sus datos, su ',
        { b: 'rectificación' },
        ', su ',
        { b: 'supresión' },
        ', la ',
        { b: 'limitación' },
        ' de su tratamiento o la ',
        { b: 'revocación' },
        ' del consentimiento otorgado. Para ejercerlos basta escribir al WhatsApp o al correo de la Tienda, identificándose adecuadamente. La solicitud se responderá dentro de los ',
        { b: 'diez (10) días hábiles' },
        '. La supresión no alcanza a la información que la Tienda deba conservar por mandato legal, como los comprobantes fiscales.',
      ],
    },
    { h3: 'Menores de edad' },
    {
      p: 'El sitio no está dirigido a la recolección de datos de menores de dieciocho (18) años. Si se detecta que se han recibido datos de un menor sin autorización de su representante legal, se procederá a eliminarlos.',
    },
    { h3: 'Modificaciones de esta política' },
    {
      p: 'Esta política puede actualizarse. La versión vigente será siempre la publicada en el sitio con su fecha de actualización. Los cambios sustanciales se anunciarán de forma visible.',
    },

    { h: 'Cookies y almacenamiento local' },
    {
      p: [
        'El sitio utiliza una cantidad mínima de tecnologías de almacenamiento en el dispositivo del Usuario, todas ellas necesarias para su funcionamiento. ',
        {
          b: 'No se utilizan cookies publicitarias ni de perfilado, ni se comparten datos con redes de publicidad.',
        },
      ],
    },
    {
      table: {
        head: ['Tecnología', 'Para qué se usa', 'Carácter'],
        rows: [
          [
            'Almacenamiento local (localStorage)',
            'Guardar el carrito de consulta y preferencias de navegación del Usuario, para que no se pierdan al recargar la página.',
            'Necesaria. Los datos permanecen en el navegador del Usuario y nunca se envían a la Tienda.',
          ],
          [
            'Cookies técnicas y de seguridad',
            'Mantener la sesión del panel administrativo y proteger el sitio frente a tráfico automatizado y ataques.',
            'Necesaria. No identifican al visitante con fines comerciales.',
          ],
          [
            'Estadísticas de uso agregadas',
            'Conocer cuántas visitas recibe el sitio y qué secciones se consultan más.',
            'Opcional, si se implementa. Los datos se tratan de forma agregada, sin identificar personas.',
          ],
        ],
      },
    },
    { h3: 'Cómo controlarlas' },
    {
      p: [
        'El Usuario puede borrar o bloquear cookies y el almacenamiento local desde la configuración de su navegador, o navegar en modo incógnito. Debe tener en cuenta que, al hacerlo, ',
        { b: 'el carrito de consulta se vaciará' },
        ' y algunas funciones del sitio podrían no comportarse correctamente.',
      ],
    },
  ],
};

const ENVIOS = {
  title: 'Política de Envío y Reembolso',
  description:
    'Envíos, retiro en el local, plazos, cambios, devoluciones y garantía de los productos comprados en Pablito Sports.',
  sections: (datos) => [
    { h: 'Envíos y entregas' },
    {
      p: 'La Tienda no realiza ventas ni envíos automatizados desde el sitio. Toda modalidad de entrega se acuerda por WhatsApp al confirmar la operación.',
    },
    { h3: 'Modalidades disponibles' },
    {
      table: {
        head: ['Modalidad', 'Cómo funciona', 'Costo y plazo'],
        rows: [
          [
            'Retiro en el local',
            `El Cliente retira su pedido en el local${
              datos.direccion ? ` (${datos.direccion})` : ''
            }, dentro del horario de atención, presentando el comprobante o el mensaje de confirmación.`,
            datos.diasReserva
              ? `Sin costo. El pedido se reserva por ${datos.diasReserva} días desde la confirmación.`
              : 'Sin costo.',
          ],
          [
            'Entrega local / delivery',
            'Disponible en la ciudad y localidades cercanas, según disponibilidad.',
            'Costo informado al confirmar la operación. Entrega coordinada por WhatsApp.',
          ],
          [
            'Envío por empresa de transporte',
            'A todo el país, mediante la empresa de encomiendas que se acuerde con el Cliente.',
            'El costo del envío es a cargo del Cliente, salvo promoción vigente. El plazo depende de la empresa de transporte.',
          ],
        ],
      },
    },
    { h3: 'Plazos de preparación' },
    {
      p: [
        'Los pedidos confirmados y abonados se preparan dentro de las ',
        { b: '24 a 48 horas hábiles' },
        ' siguientes. Los plazos de tránsito posteriores dependen de la empresa de transporte y son estimativos, no vinculantes. Los pedidos confirmados fuera del horario de atención, en domingo o en feriado se procesan el siguiente día hábil.',
      ],
    },
    { h3: 'Datos de entrega' },
    {
      p: 'El Cliente es responsable de la exactitud de los datos que proporciona (nombre, teléfono, dirección, ciudad, referencias). Los costos derivados de una entrega fallida por datos erróneos, ausencia reiterada del destinatario o rechazo del envío quedan a cargo del Cliente.',
    },
    { h3: 'Verificación al recibir' },
    {
      p: [
        'Se recomienda revisar el paquete al momento de recibirlo. Si el embalaje presenta daños visibles, conviene dejar constancia ante el transportista, fotografiarlo y avisar a la Tienda dentro de las ',
        { b: '24 horas' },
        '. Pasado ese plazo, la Tienda podrá no dar curso al reclamo por daños de transporte.',
      ],
    },
    { h3: 'Riesgo' },
    {
      p: 'Cuando el Cliente elige la empresa de transporte, el riesgo de pérdida o daño se transfiere al momento de la entrega del paquete al transportista. La Tienda colabora activamente en la gestión del reclamo ante la empresa, pero no responde por hechos imputables a esta.',
    },

    { h: 'Cambios y devoluciones' },
    {
      p: `Esta política se aplica a los productos efectivamente adquiridos a la Tienda, ya sea en el local o mediante una operación coordinada por WhatsApp. Se complementa —y nunca sustituye— con los derechos reconocidos por la ${LEY_CONSUMIDOR}.`,
    },
    { h3: 'Plazos' },
    {
      table: {
        head: ['Situación', 'Plazo para reclamar', 'Se cuenta desde'],
        rows: [
          [
            'Cambio por talle, color o modelo',
            '8 días corridos',
            'La entrega o el retiro del producto.',
          ],
          [
            'Producto con defecto de fábrica',
            '30 días corridos',
            'La entrega, para defectos aparentes. Los defectos ocultos se reclaman al momento de detectarlos, dentro de la garantía.',
          ],
          [
            'Producto equivocado o incompleto respecto de lo acordado',
            '48 horas',
            'La recepción del pedido.',
          ],
          [
            'Producto dañado durante el transporte',
            '24 horas',
            'La recepción del pedido, adjuntando fotografías del embalaje y del producto.',
          ],
        ],
      },
    },
    { h3: 'Condiciones que debe cumplir el producto' },
    {
      ul: [
        [
          'Estar ',
          { b: 'sin uso' },
          ', sin lavar, sin planchar, sin alteraciones y sin olores (perfume, humo, transpiración).',
        ],
        ['Conservar ', { b: 'todas sus etiquetas originales' }, ' adheridas y sus precintos intactos.'],
        [
          'Incluir su ',
          { b: 'embalaje original' },
          ' en buen estado —en el caso del calzado, la caja, que no debe usarse como embalaje de envío— y todos sus accesorios.',
        ],
        [
          'Presentarse junto con el ',
          { b: 'comprobante de compra' },
          ' (factura o ticket). Sin comprobante no se puede procesar el cambio.',
        ],
      ],
    },
    { h3: 'Productos excluidos del cambio' },
    {
      p: 'Por razones de higiene, seguridad o personalización, no admiten cambio ni devolución, salvo defecto de fábrica comprobado:',
    },
    {
      ul: [
        'Ropa interior, mallas, trajes de baño y medias.',
        'Protectores bucales, vendas, suspensores y artículos de contacto directo con la piel.',
        'Productos personalizados: estampados, numerados, bordados o con nombre.',
        'Artículos identificados expresamente como «liquidación final» o «última unidad, sin cambio» al momento de la venta.',
      ],
    },
    { h3: 'Procedimiento' },
    {
      ol: [
        'Escribir al WhatsApp de la Tienda dentro del plazo aplicable, indicando el número de comprobante, el producto y el motivo.',
        'Adjuntar fotografías claras del producto, sus etiquetas y, si corresponde, del defecto.',
        'La Tienda responde confirmando si el caso procede e indica cómo continuar.',
        'Presentar el producto en el local, o remitirlo por el medio que se acuerde.',
        [
          'La Tienda verifica el estado del producto y resuelve el cambio, la reparación o la devolución dentro de los ',
          { b: 'cinco (5) días hábiles' },
          ' siguientes a su recepción.',
        ],
      ],
    },
    { h3: 'Diferencias de precio' },
    {
      p: [
        'Si el producto de reemplazo tiene un valor mayor, el Cliente abona la diferencia. Si tiene un valor menor, la diferencia se entrega como ',
        { b: 'nota de crédito' },
        ' para utilizar en la Tienda, salvo que corresponda devolución de dinero.',
      ],
    },
    { h3: 'Devolución del importe' },
    { p: 'La Tienda reintegra el importe abonado cuando:' },
    {
      ul: [
        'El producto presenta un defecto de fábrica que no admite reparación ni reemplazo por otra unidad igual.',
        'La Tienda no puede entregar lo acordado y no existe alternativa aceptada por el Cliente.',
        'Corresponde por aplicación de la Ley N.º 1.334/98.',
      ],
    },
    {
      p: [
        'El reintegro se realiza por el mismo medio de pago utilizado, dentro de los ',
        { b: 'diez (10) días hábiles' },
        ' desde la aprobación del caso. Los cambios por talle, color o preferencia no dan lugar a devolución de dinero: se resuelven con cambio de producto o nota de crédito.',
      ],
    },
    { h3: 'Costos' },
    {
      p: [
        'El cambio no tiene costo adicional sobre el producto. Cuando el motivo es una preferencia del Cliente (talle, color, modelo), ',
        { b: 'los costos de traslado o envío del producto son a su cargo' },
        '. Cuando el motivo es un error de la Tienda o un defecto de fábrica, ',
        { b: 'la Tienda asume esos costos' },
        '.',
      ],
    },
    { h3: 'Garantía' },
    {
      p: [
        'Los productos cuentan con la garantía legal por defectos de fábrica y, cuando corresponda, con la garantía que otorgue el fabricante o importador. La garantía ',
        { b: 'no cubre' },
        ' el desgaste normal por uso, roturas por mal uso, uso distinto al previsto para el artículo, lavado o secado incorrecto, modificaciones realizadas por terceros ni daños accidentales.',
      ],
    },
  ],
};

const PREGUNTAS = {
  title: 'Preguntas Frecuentes',
  description:
    'Respuestas rápidas sobre cómo comprar en Pablito Sports: consulta por WhatsApp, precios, stock, envíos, cambios y facturación.',
  sections: (datos) => [
    { h3: '¿Puedo comprar y pagar directamente desde la página?' },
    {
      p: 'No. El sitio es un catálogo: te permite ver los productos y armar una lista de consulta que se envía por WhatsApp. El pago se coordina con un vendedor, por transferencia o en el local.',
    },
    { h3: '¿Los precios que veo son los definitivos?' },
    {
      p: 'Son precios de referencia. El precio final se confirma al responder tu consulta, junto con la disponibilidad real del talle que necesitás.',
    },
    { h3: 'Agregué un producto al carrito. ¿Queda reservado?' },
    {
      p: 'No. El carrito es solo una lista para consultar. La mercadería se reserva recién cuando un vendedor lo confirma.',
    },
    { h3: '¿Necesito crear una cuenta?' },
    {
      p: 'No. El sitio no tiene registro de usuarios ni contraseñas. Podés navegar y consultar libremente.',
    },
    { h3: '¿Qué datos míos guarda la página?' },
    {
      p: 'Ninguno de carácter personal. El carrito queda guardado en tu propio navegador. Los datos que compartas por WhatsApp los recibe la Tienda a través de esa aplicación.',
    },
    { h3: '¿Hacen envíos al interior?' },
    {
      p: 'Sí, por empresa de encomiendas, con el costo a cargo del comprador salvo promoción vigente. Se coordina por WhatsApp.',
    },
    { h3: 'Me quedó chico el talle. ¿Puedo cambiarlo?' },
    {
      p: 'Sí, dentro de los 8 días corridos desde la entrega, con el producto sin uso, con etiquetas y con el comprobante de compra. Los detalles están en la Política de Envío y Reembolso.',
    },
    { h3: '¿Me devuelven el dinero si me arrepiento?' },
    {
      p: 'Los cambios por preferencia se resuelven con otro producto o nota de crédito. La devolución de dinero procede ante defecto de fábrica sin solución o cuando la ley lo establece.',
    },
    { h3: '¿Emiten factura?' },
    {
      p: 'Sí. Toda operación cuenta con su comprobante legal. Guardalo: es necesario para cambios y garantía.',
    },
    { h3: '¿Cómo sé que estoy hablando con la tienda real?' },
    {
      p: `${
        datos.whatsapp
          ? `El único número oficial es el ${datos.whatsapp}, publicado en este sitio.`
          : 'El único número oficial es el publicado en este sitio.'
      } La Tienda nunca pide claves, códigos de verificación ni datos de tarjeta por chat.`,
    },

    ...contacto(datos),
  ],
};

export const LEGAL_PAGES = {
  terminos: TERMINOS,
  privacidad: PRIVACIDAD,
  envios: ENVIOS,
  preguntas: PREGUNTAS,
};

/**
 * Reúne en un solo objeto todo lo variable de los textos.
 *
 * Aislada del componente para poder probarla sin montar React: es la que decide
 * qué fila aparece y cuál se omite.
 */
export function buildLegalData(storeSettings, about) {
  const redes = storeSettings?.social_links ?? {};
  return {
    tienda: storeSettings?.store_name || 'Pablito Sports',
    whatsapp: storeSettings?.whatsapp_number || null,
    direccion: storeSettings?.address || null,
    horario: storeSettings?.business_hours || null,
    instagram: redes.instagram || null,
    facebook: redes.facebook || null,
    email: about?.email || LEGAL_ENTITY.email,
    razonSocial: LEGAL_ENTITY.razonSocial,
    ruc: LEGAL_ENTITY.ruc,
    diasReserva: LEGAL_ENTITY.diasReservaRetiro,
  };
}
