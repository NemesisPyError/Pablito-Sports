# -*- coding: utf-8 -*-
"""
ADP-07 — Medicion del presupuesto de longitud del mensaje de WhatsApp.

Mide, para las plantillas por defecto de 01_ANALISIS_NEGOCIO.md 12.3:

  1. longitud real del mensaje       (caracteres Unicode y bytes UTF-8)
  2. longitud del mensaje codificado (encodeURIComponent)
  3. longitud total del enlace wa.me

para N = 1..40 items, en tres escenarios de datos.

Reproducible:  python medir_longitud_mensaje.py
Sin dependencias externas. Python 3.8+.

El script NO decide el limite practico de WhatsApp: solo mide.
El limite se documenta aparte, con su propia evidencia.
"""

import unicodedata
from urllib.parse import quote

# ---------------------------------------------------------------------------
# 1. Plantillas por defecto — copia literal de 01_ANALISIS_NEGOCIO.md 12.3
# ---------------------------------------------------------------------------

PLANTILLA_MENSAJE = """Hola {tienda}! \U0001F44B
Quiero consultar por estos productos:

{items}
--------------------------------
Total estimado: {total}
(Precios sujetos a confirmacion)

Consulta N.º: {codigo_consulta}"""

PLANTILLA_ITEM_COMPLETO = """{numero}) {producto}
   Marca: {marca} | Talle: {talle} | Color: {color}
   Cantidad: {cantidad} x {precio_unitario} = {subtotal}
   Estado: {disponibilidad}"""

# Regla 13.9 de 02_ARQUITECTURA.md: la etiqueta y su valor se omiten juntos.
PLANTILLA_ITEM_SIN_VARIANTE = """{numero}) {producto}
   Marca: {marca}
   Cantidad: {cantidad} x {precio_unitario} = {subtotal}
   Estado: {disponibilidad}"""

TIENDA = "Pablito Sports"
CODIGO_CONSULTA = "PS-48213"   # formato RN-64: PS-XXXXX

# ---------------------------------------------------------------------------
# 2. Escenarios de datos
# ---------------------------------------------------------------------------
# Cada escenario define un item representativo que se repite N veces.
# Se repite a proposito: el objetivo es un coste por item estable y auditable,
# no una simulacion de carrito real.

ESCENARIOS = {
    "corto": {
        "descripcion": "Item minimo: producto sin variante (13.9 omite Talle y Color), "
                       "nombre y marca breves.",
        "plantilla": PLANTILLA_ITEM_SIN_VARIANTE,
        "datos": {
            "producto": "Pelota Penalty S11 R1",
            "marca": "Penalty",
            "cantidad": "1",
            "precio_unitario": "Gs. 340.000",
            "subtotal": "Gs. 340.000",
            "disponibilidad": "Disponible",
        },
        "subtotal_num": 340_000,
    },
    "tipico": {
        "descripcion": "Item tipico: producto con variante completa, nombre y marca "
                       "de longitud habitual en el catalogo.",
        "plantilla": PLANTILLA_ITEM_COMPLETO,
        "datos": {
            "producto": "Botín Nike Mercurial Vapor 16",
            "marca": "Nike",
            "talle": "42",
            "color": "Negro",
            "cantidad": "1",
            "precio_unitario": "Gs. 850.000",
            "subtotal": "Gs. 850.000",
            "disponibilidad": "Disponible",
        },
        "subtotal_num": 850_000,
    },
    "extenso": {
        "descripcion": "Peor caso razonable: nombre de producto largo, marca larga, "
                       "color compuesto, cantidad de dos digitos, estado largo.",
        "plantilla": PLANTILLA_ITEM_COMPLETO,
        "datos": {
            "producto": "Camiseta Oficial Selección Paraguaya Titular 2026 "
                        "Versión Jugador Manga Larga",
            "marca": "Adidas Performance",
            "talle": "XXL",
            "color": "Blanco con detalles rojo y azul",
            "cantidad": "12",
            "precio_unitario": "Gs. 1.250.000",
            "subtotal": "Gs. 15.000.000",
            "disponibilidad": "Próximamente",
        },
        "subtotal_num": 15_000_000,
    },
}

# ---------------------------------------------------------------------------
# 3. Composicion
# ---------------------------------------------------------------------------

NUMERO_WHATSAPP = "595981123456"   # formato internacional sin '+', 12 digitos (PY)
BASE_WA_ME = "https://wa.me/" + NUMERO_WHATSAPP + "?text="


def formatear_guaranies(valor: int) -> str:
    return "Gs. " + "{:,}".format(valor).replace(",", ".")


def componer_items(escenario: dict, n: int) -> str:
    partes = []
    for i in range(1, n + 1):
        datos = dict(escenario["datos"])
        datos["numero"] = str(i)
        partes.append(escenario["plantilla"].format(**datos))
    return "\n\n".join(partes)


def componer_mensaje(escenario: dict, n: int) -> str:
    return PLANTILLA_MENSAJE.format(
        tienda=TIENDA,
        items=componer_items(escenario, n),
        total=formatear_guaranies(escenario["subtotal_num"] * n),
        codigo_consulta=CODIGO_CONSULTA,
    )


# encodeURIComponent no codifica:  A-Z a-z 0-9 - _ . ! ~ * ' ( )
SEGUROS_ENCODE_URI_COMPONENT = "-_.!~*'()"


def codificar(texto: str) -> str:
    """Equivalente exacto a encodeURIComponent() de JavaScript."""
    return quote(texto, safe=SEGUROS_ENCODE_URI_COMPONENT, encoding="utf-8")


def medir(escenario: dict, n: int) -> dict:
    mensaje = componer_mensaje(escenario, n)
    codificado = codificar(mensaje)
    url = BASE_WA_ME + codificado
    return {
        "n": n,
        "caracteres": len(mensaje),
        "bytes_utf8": len(mensaje.encode("utf-8")),
        "codificado": len(codificado),
        "url_total": len(url),
    }


# ---------------------------------------------------------------------------
# 4. Verificacion de la equivalencia con encodeURIComponent
# ---------------------------------------------------------------------------

def autotest() -> None:
    """Casos conocidos de encodeURIComponent. Si fallan, la medicion no vale."""
    casos = [
        (" ", "%20"),
        ("\n", "%0A"),
        ("|", "%7C"),
        (":", "%3A"),
        ("(", "("),
        ("'", "'"),
        ("!", "!"),
        ("~", "~"),
        ("*", "*"),
        ("-_.", "-_."),
        ("í", "%C3%AD"),          # i acentuada -> 2 bytes -> 6 caracteres
        ("º", "%C2%BA"),          # ordinal masculino
        ("\U0001F44B", "%F0%9F%91%8B"),  # emoji -> 4 bytes -> 12 caracteres
    ]
    for entrada, esperado in casos:
        obtenido = codificar(entrada)
        assert obtenido == esperado, (
            "encodeURIComponent(%r): esperado %r, obtenido %r"
            % (entrada, esperado, obtenido)
        )
    print("Autotest encodeURIComponent: 13/13 OK\n")


# ---------------------------------------------------------------------------
# 5. Salida
# ---------------------------------------------------------------------------

def imprimir_cabecera(titulo: str) -> None:
    print("=" * 78)
    print(titulo)
    print("=" * 78)


def main() -> None:
    autotest()

    imprimir_cabecera("ENTORNO Y ENTRADAS")
    print("Plantillas          : 01_ANALISIS_NEGOCIO.md 12.3 (copia literal)")
    print("Numero WhatsApp     : %s  (%d digitos)" % (NUMERO_WHATSAPP, len(NUMERO_WHATSAPP)))
    print("Prefijo wa.me       : %r  -> %d caracteres" % (BASE_WA_ME, len(BASE_WA_ME)))
    print("Codigo de consulta  : %s" % CODIGO_CONSULTA)
    print("Unicode             : %s" % unicodedata.unidata_version)
    print()

    # --- Coste fijo del mensaje (N = 0, sin items) --------------------------
    envoltura = PLANTILLA_MENSAJE.format(
        tienda=TIENDA, items="", total=formatear_guaranies(0),
        codigo_consulta=CODIGO_CONSULTA,
    )
    imprimir_cabecera("COSTE FIJO DE LA ENVOLTURA (sin items)")
    print("caracteres            : %d" % len(envoltura))
    print("bytes UTF-8           : %d" % len(envoltura.encode("utf-8")))
    print("codificado (URI)      : %d" % len(codificar(envoltura)))
    print()

    # --- Coste por item -----------------------------------------------------
    imprimir_cabecera("COSTE MARGINAL POR ITEM  (medido como delta N -> N+1)")
    print("%-10s %14s %14s %16s %10s" % (
        "escenario", "caracteres", "bytes UTF-8", "codificado", "expansion"))
    print("-" * 78)
    costes = {}
    for nombre, esc in ESCENARIOS.items():
        m10 = medir(esc, 10)
        m11 = medir(esc, 11)
        d_car = m11["caracteres"] - m10["caracteres"]
        d_byt = m11["bytes_utf8"] - m10["bytes_utf8"]
        d_cod = m11["codificado"] - m10["codificado"]
        costes[nombre] = d_cod
        print("%-10s %14d %14d %16d %9.2fx" % (
            nombre, d_car, d_byt, d_cod, d_cod / d_car))
    print()

    # --- Tabla completa por escenario ---------------------------------------
    for nombre, esc in ESCENARIOS.items():
        imprimir_cabecera("ESCENARIO '%s'" % nombre.upper())
        print(esc["descripcion"])
        print()
        print("%4s %13s %13s %14s %14s" % (
            "N", "caracteres", "bytes UTF-8", "codificado", "URL total"))
        print("-" * 78)
        for n in list(range(1, 11)) + [15, 20, 25, 30, 35, 40]:
            r = medir(esc, n)
            print("%4d %13d %13d %14d %14d" % (
                r["n"], r["caracteres"], r["bytes_utf8"],
                r["codificado"], r["url_total"]))
        print()

    # --- Muestra renderizada verificable ------------------------------------
    imprimir_cabecera("MUESTRA RENDERIZADA — escenario 'tipico', N = 3")
    muestra = componer_mensaje(ESCENARIOS["tipico"], 3)
    print(muestra)
    print()
    print("-- longitudes de la muestra --")
    print("caracteres      : %d" % len(muestra))
    print("bytes UTF-8     : %d" % len(muestra.encode("utf-8")))
    print("codificado      : %d" % len(codificar(muestra)))
    print("URL wa.me total : %d" % len(BASE_WA_ME + codificar(muestra)))
    print()

    imprimir_cabecera("URL COMPLETA DE LA MUESTRA (verificable a mano)")
    print(BASE_WA_ME + codificar(muestra))
    print()

    # --- Tabla inversa: cuantos items caben bajo un techo dado --------------
    imprimir_cabecera("ITEMS QUE CABEN BAJO UN TECHO DE URL DADO")
    print("El techo NO lo decide este script. Se tabulan varios valores para que")
    print("la decision de ADP-07 se tome sobre numeros medidos.")
    print()
    techos = [2000, 4096, 8192, 16384, 32768, 65536]
    print("%10s %12s %12s %12s" % ("techo URL", "corto", "tipico", "extenso"))
    print("-" * 78)
    for techo in techos:
        fila = [techo]
        for nombre, esc in ESCENARIOS.items():
            cabe = 0
            for n in range(1, 4001):
                if medir(esc, n)["url_total"] <= techo:
                    cabe = n
                else:
                    break
            fila.append(cabe)
        print("%10d %12d %12d %12d" % tuple(fila))
    print()


if __name__ == "__main__":
    main()
