"""Plantillas de WhatsApp por defecto (01_ANALISIS_NEGOCIO.md §12.3).

`RN-61`: el sistema provee una plantilla por defecto **restaurable en cualquier
momento**. Este módulo es su origen autoritativo del lado del servidor, que es
lo que `POST /admin/store/whatsapp-template/reset` (§9.13) devuelve.

Se transcriben literalmente del documento aprobado. Las variables obligatorias
del mensaje (§12.1) son `{{items}}` y `{{total}}`; ambas figuran aquí, de modo
que la plantilla por defecto siempre pasa la validación de `RN-60`.
"""

DEFAULT_MESSAGE_TEMPLATE = """Hola {{tienda}}! 👋
Quiero consultar por estos productos:

{{items}}
--------------------------------
Total estimado: {{total}}
(Precios sujetos a confirmación)

Consulta N.º: {{codigo_consulta}}"""

DEFAULT_ITEM_TEMPLATE = """{{numero}}) {{producto}}
   Marca: {{marca}} | Talle: {{talle}}
   Cantidad: {{cantidad}} x {{precio_unitario}} = {{subtotal}}
   Estado: {{disponibilidad}}"""
