"""Documento HTML mínimo para rastreadores (05_API.md §6.3).

§6.3 fija el contenido: `<title>`, `description`, Open Graph, canónica, y **sin
interfaz, sin estado de sesión y sin JavaScript**. Este módulo sólo compone
texto: no consulta la base ni conoce el dominio (10_BACKEND.md §8.8).

El escapado es obligatorio y no decorativo: el nombre y la descripción de un
producto los escribe el administrador, y una comilla suelta rompería el atributo
`content` de la metaetiqueta.
"""

import json
from html import escape


def _attr(valor: str) -> str:
    """Escapa para un valor de atributo, comillas incluidas."""
    return escape(str(valor), quote=True)


def _meta(nombre: str, contenido, *, propiedad: bool = False) -> str | None:
    """Omite la etiqueta cuando no hay valor, en vez de emitirla vacía.

    Un `og:image` vacío es peor que ausente: la red social muestra una tarjeta
    rota en lugar de caer en su presentación por defecto.
    """
    if contenido in (None, ""):
        return None
    clave = "property" if propiedad else "name"
    return f'<meta {clave}="{_attr(nombre)}" content="{_attr(contenido)}">'


def render_document(documento: dict) -> str:
    """Compone el HTML a partir de un documento ya resuelto.

    Claves esperadas: `title`, `description`, `canonical`, `og` (dict),
    `twitter` (dict), `structured_data` (dict o None) y `heading`.
    """
    og = documento.get("og") or {}
    twitter = documento.get("twitter") or {}

    etiquetas = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{escape(documento['title'])}</title>",
        _meta("description", documento.get("description")),
        # §6.4: estos documentos son para indexar; nada aquí es privado.
        _meta("robots", documento.get("robots", "index,follow")),
    ]

    if documento.get("canonical"):
        etiquetas.append(f'<link rel="canonical" href="{_attr(documento["canonical"])}">')

    for nombre in ("title", "description", "image", "url", "type", "site_name"):
        etiquetas.append(_meta(f"og:{nombre}", og.get(nombre), propiedad=True))

    for nombre in ("card", "title", "description", "image"):
        etiquetas.append(_meta(f"twitter:{nombre}", twitter.get(nombre)))

    # 06_FRONTEND.md §17.4: los datos estructurados los genera el backend.
    datos = documento.get("structured_data")
    if datos:
        # `</script>` dentro de una cadena JSON cerraría el bloque antes de
        # tiempo; escapar la barra lo impide sin alterar el valor.
        serializado = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
        etiquetas.append(f'<script type="application/ld+json">{serializado}</script>')

    cabeza = "\n    ".join(etiqueta for etiqueta in etiquetas if etiqueta)

    # El cuerpo lleva el mismo contenido en texto: algunos rastreadores leen el
    # documento visible además de las metaetiquetas.
    cuerpo = [f"<h1>{escape(documento.get('heading') or documento['title'])}</h1>"]
    if documento.get("description"):
        cuerpo.append(f"<p>{escape(documento['description'])}</p>")
    for enlace in documento.get("links") or []:
        cuerpo.append(f'<a href="{_attr(enlace["url"])}">{escape(enlace["label"])}</a>')

    contenido = "\n    ".join(cuerpo)

    return (
        "<!doctype html>\n"
        '<html lang="es">\n'
        "  <head>\n"
        f"    {cabeza}\n"
        "  </head>\n"
        "  <body>\n"
        f"    {contenido}\n"
        "  </body>\n"
        "</html>\n"
    )
