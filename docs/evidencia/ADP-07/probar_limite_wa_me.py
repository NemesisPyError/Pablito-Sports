# -*- coding: utf-8 -*-
"""
ADP-07 — Limite de transporte del enlace wa.me.

Mide hasta que longitud de URL el servidor de wa.me acepta la peticion.

Solo peticiones GET al endpoint publico de redireccion. No envia ningun
mensaje, no requiere sesion de WhatsApp y no crea estado en ningun lado:
wa.me responde con la pagina intermedia de "Continuar al chat".

Reproducible:  python probar_limite_wa_me.py
Requiere: curl en el PATH. Sin dependencias de Python externas.

Por que curl y no http.client: en el equipo de medicion el trafico TLS pasa
por un intermediario que reemplaza el certificado. La verificacion propia de
Python falla (CERTIFICATE_VERIFY_FAILED) mientras que curl, que usa el almacen
de certificados del sistema, la supera. La URL se pasa por fichero de
configuracion (-K) porque a partir de ~32 KB excede el limite de argumentos
del proceso, lo que produciria un falso negativo del lado del cliente.

IMPORTANTE — que mide y que NO mide:

  MIDE   el techo del TRANSPORTE: hasta que longitud de URL la cadena
         cliente -> intermediario TLS -> red -> servidor de wa.me acepta
         la peticion.

  NO MIDE si WhatsApp coloca integro ese texto en el cuadro de redaccion.
         Un 200 significa "la URL llego", no "el mensaje cabe".

El presupuesto de ADP-07 debe respetar el MENOR de los dos techos.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

NUMERO = "595981123456"
PREFIJO_URL = "https://wa.me/%s?text=" % NUMERO
PREFIJO_LEN = len(PREFIJO_URL)

AGENTE = ("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36")


def probar(longitud_url_total: int, timeout: int = 40):
    """Devuelve (codigo_http, detalle, longitud_real)."""
    relleno = max(1, longitud_url_total - PREFIJO_LEN)
    url = PREFIJO_URL + ("A" * relleno)

    fd, ruta_cfg = tempfile.mkstemp(suffix=".curlcfg", text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write('url = "%s"\n' % url)
            fh.write('user-agent = "%s"\n' % AGENTE)
            fh.write("silent\n")
            fh.write("show-error\n")
            fh.write('output = "%s"\n' % (os.devnull.replace("\\", "/")))
            fh.write('write-out = "%{http_code}"\n')
            fh.write("max-time = %d\n" % timeout)

        proc = subprocess.run(
            ["curl", "-K", ruta_cfg],
            capture_output=True, text=True, timeout=timeout + 15,
        )
        salida = (proc.stdout or "").strip()
        error = (proc.stderr or "").strip()

        if salida.isdigit() and salida != "000":
            return int(salida), salida, len(url)
        detalle = error.splitlines()[0] if error else "sin respuesta (codigo 000)"
        return None, detalle, len(url)
    except Exception as exc:
        return None, "%s: %s" % (type(exc).__name__, exc), len(url)
    finally:
        try:
            os.unlink(ruta_cfg)
        except OSError:
            pass


def main() -> None:
    if shutil.which("curl") is None:
        print("ERROR: curl no esta en el PATH. La sonda no puede ejecutarse.")
        sys.exit(1)

    version_curl = subprocess.run(
        ["curl", "--version"], capture_output=True, text=True
    ).stdout.splitlines()[0]

    print("=" * 78)
    print("LIMITE DE TRANSPORTE DE wa.me")
    print("=" * 78)
    print("Fecha    : %s" % datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    print("Prefijo  : %s  (%d caracteres)" % (PREFIJO_URL, PREFIJO_LEN))
    print("curl     : %s" % version_curl)
    print("Python   : %s" % sys.version.split()[0])
    print()
    print("%-10s %-12s %-8s %s" % ("objetivo", "url real", "HTTP", "detalle"))
    print("-" * 78)

    escalones = [500, 1000, 2000, 4000, 8000, 8192, 12000, 16000, 20000,
                 32768, 40000, 65536, 80000, 100000, 131072, 200000]

    ultimo_ok = 0
    primer_fallo = None
    for n in escalones:
        codigo, detalle, real = probar(n)
        print("%-10d %-12d %-8s %s" % (n, real, codigo if codigo else "-", detalle))
        if codigo is not None and 200 <= codigo < 400:
            ultimo_ok = n
        elif primer_fallo is None:
            primer_fallo = n
        time.sleep(0.5)

    print()
    print("-" * 78)
    print("Ultima longitud aceptada : %d" % ultimo_ok)
    print("Primera no aceptada      : %s"
          % (primer_fallo if primer_fallo else "ninguna dentro del rango probado"))
    print()
    print("Lectura: 2xx/3xx = el transporte acepto la URL.")
    print("         414     = URI Too Long (rechazo explicito del servidor).")
    print("         -       = fallo de transporte antes de obtener respuesta.")
    print()
    print("Este techo NO autoriza a usarlo como presupuesto. Es solo el limite")
    print("superior del transporte; el limite de WhatsApp como cuerpo de mensaje")
    print("es independiente y se documenta aparte.")


if __name__ == "__main__":
    main()
