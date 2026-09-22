"""Contador de rate limiting compartido entre workers (03_SEGURIDAD.md §14.4).

El problema que fija esta suite: con `RATELIMIT_STORAGE_URI = "memory://"` el
contador vive dentro del proceso. Gunicorn corre con varios *workers*, así que
cada uno llevaba el suyo y el login de «5 intentos cada 15 minutos» admitía en
realidad `5 × nº de workers`, repartidos de forma imprevisible según qué worker
atendiera cada petición.

**Por qué procesos de verdad y no dos aplicaciones en el mismo proceso.**
`Limiter.init_app` guarda el almacén en el propio objeto `Limiter`
(`self._storage`), y `app.extensions.limiter` es un singleton de módulo. Dos
`create_app()` dentro de un mismo proceso comparten ese objeto, de modo que un
test así pasaría **incluso con `memory://`** y no demostraría nada. Cada worker
de Gunicorn es un proceso independiente con su propio `Limiter`; para reproducir
esa condición hay que bifurcar de verdad.

El control `test_con_almacen_en_memoria_los_procesos_NO_comparten` existe
precisamente para eso: si el almacén compartido dejara de estarlo, ese test
pasaría a comportarse como el principal y la diferencia entre ambos delataría la
regresión.
"""

import multiprocessing
import os

import pytest
from flask_migrate import upgrade

from app import create_app
from app.core.config import TestingConfig
from app.extensions import db, limiter

# Almacén dedicado a los tests (Compose lo apunta a la base 1 del mismo Redis,
# para que `limiter.reset()` no borre los contadores de desarrollo). Sin la
# variable no hay nada que compartir y la suite sigue corriendo sin Redis.
ALMACEN = os.environ.get("TEST_RATELIMIT_STORAGE_URI", "").strip()

pytestmark = [
    pytest.mark.skipif(
        not ALMACEN or ALMACEN.startswith("memory:"),
        reason="TEST_RATELIMIT_STORAGE_URI no apunta a un almacén compartido",
    ),
    pytest.mark.skipif(
        "fork" not in multiprocessing.get_all_start_methods(),
        reason="se necesita `fork` para simular workers de Gunicorn",
    ),
]

LOGIN = "/api/v1/admin/auth/login"
CREDENCIALES = {"username": "no-existe-a-proposito", "password": "tampoco"}


# ---------------------------------------------------------------------------
# Proceso hijo = worker de Gunicorn
# ---------------------------------------------------------------------------


def _worker(almacen: str, intentos: int, ip: str, cola):
    """Crea su propia aplicación y golpea el login. Corre en OTRO proceso.

    Devuelve los códigos de estado y las cabeceras del último intento, que es lo
    que permite comprobar el contrato del 429 sin volver a pedirlo desde el
    padre.
    """
    try:

        class Config(TestingConfig):
            RATELIMIT_ENABLED = True
            RATELIMIT_STORAGE_URI = almacen

        aplicacion = create_app(Config)
        with aplicacion.app_context():
            # El hijo hereda por `fork` el pool de conexiones del padre. Se
            # descarta para que abra las suyas y no comparta un socket.
            db.engine.dispose()

        cliente = aplicacion.test_client()
        codigos = []
        cabeceras = {}
        for _ in range(intentos):
            respuesta = cliente.post(
                LOGIN, json=CREDENCIALES, environ_overrides={"REMOTE_ADDR": ip}
            )
            codigos.append(respuesta.status_code)
            cabeceras = dict(respuesta.headers)
        cola.put({"codigos": codigos, "cabeceras": cabeceras})
    except Exception as error:  # pragma: no cover - solo si el hijo no arranca
        cola.put({"error": f"{type(error).__name__}: {error}"})


def _en_proceso_aparte(almacen: str, intentos: int, ip: str = "203.0.113.10") -> dict:
    """Ejecuta `_worker` en un proceso nuevo y devuelve su resultado."""
    contexto = multiprocessing.get_context("fork")
    cola = contexto.Queue()
    proceso = contexto.Process(target=_worker, args=(almacen, intentos, ip, cola))
    proceso.start()
    resultado = cola.get(timeout=60)
    proceso.join(timeout=30)
    assert "error" not in resultado, resultado.get("error")
    return resultado


@pytest.fixture
def almacen_limpio(schema_app):
    """Deja el contador a cero antes y después: los tests no se contaminan."""

    class Config(TestingConfig):
        RATELIMIT_ENABLED = True
        RATELIMIT_STORAGE_URI = ALMACEN

    aplicacion = create_app(Config)
    with aplicacion.app_context():
        upgrade()

    def vaciar():
        with aplicacion.app_context():
            limiter.reset()

    vaciar()
    yield aplicacion
    vaciar()


# ---------------------------------------------------------------------------
# La propiedad que se corrige
# ---------------------------------------------------------------------------


def test_dos_procesos_distintos_comparten_el_contador_del_login(almacen_limpio):
    """3 intentos en un proceso + 3 en otro = 5 permitidos y el 6.º rechazado."""
    primero = _en_proceso_aparte(ALMACEN, 3)
    segundo = _en_proceso_aparte(ALMACEN, 3)

    codigos = primero["codigos"] + segundo["codigos"]

    assert len(codigos) == 6
    assert codigos.count(429) == 1, codigos
    assert codigos[-1] == 429, codigos
    # Los cinco primeros llegaron al servicio y fallaron por credenciales, no
    # por límite: el contador cuenta intentos reales, no rechazos.
    assert codigos[:5] == [401] * 5, codigos


def test_con_almacen_en_memoria_los_procesos_NO_comparten(almacen_limpio):
    """Control: demuestra que el test anterior detecta de verdad la regresión.

    Con `memory://` cada proceso arranca con su propio contador, así que los
    mismos 3 + 3 intentos pasan enteros. Si este test empezara a ver un 429,
    significaría que el principal está midiendo otra cosa.
    """
    primero = _en_proceso_aparte("memory://", 3)
    segundo = _en_proceso_aparte("memory://", 3)

    codigos = primero["codigos"] + segundo["codigos"]

    assert codigos.count(429) == 0, codigos
    assert codigos == [401] * 6, codigos


def test_un_proceso_nuevo_no_devuelve_cupo(almacen_limpio):
    """Reiniciar un worker no reinicia el límite: el almacén vive fuera."""
    agotador = _en_proceso_aparte(ALMACEN, 5)
    assert agotador["codigos"] == [401] * 5, agotador["codigos"]

    # Proceso completamente nuevo, como un worker recién levantado.
    recien_llegado = _en_proceso_aparte(ALMACEN, 1)

    assert recien_llegado["codigos"] == [429]


def test_una_ip_distinta_conserva_su_propio_limite(almacen_limpio):
    """El contador es por IP: agotar una no debe castigar a las demás."""
    _en_proceso_aparte(ALMACEN, 5, ip="203.0.113.10")
    bloqueada = _en_proceso_aparte(ALMACEN, 1, ip="203.0.113.10")
    otra = _en_proceso_aparte(ALMACEN, 1, ip="198.51.100.77")

    assert bloqueada["codigos"] == [429]
    assert otra["codigos"] == [401]


def test_el_429_conserva_el_contrato_actual(almacen_limpio):
    """El almacén cambió; la respuesta al cliente no."""
    _en_proceso_aparte(ALMACEN, 5)
    rechazado = _en_proceso_aparte(ALMACEN, 1)
    cabeceras = rechazado["cabeceras"]

    assert rechazado["codigos"] == [429]
    # §14.3: el cliente necesita saber cuándo reintentar.
    assert "Retry-After" in cabeceras
    # `RATELIMIT_HEADERS_ENABLED`: las cabeceras informativas siguen saliendo.
    assert cabeceras.get("X-RateLimit-Limit") == "5"
    assert cabeceras.get("X-RateLimit-Remaining") == "0"
    assert "X-RateLimit-Reset" in cabeceras


def test_el_429_sigue_siendo_json_con_la_envoltura(almacen_limpio):
    """AD-16: un 429 es una respuesta más del contrato, no un error suelto."""
    cliente = almacen_limpio.test_client()
    for _ in range(5):
        cliente.post(LOGIN, json=CREDENCIALES)
    respuesta = cliente.post(LOGIN, json=CREDENCIALES)

    assert respuesta.status_code == 429
    cuerpo = respuesta.get_json()
    assert set(cuerpo) == {"success", "data", "errors", "meta"}
    assert cuerpo["success"] is False
    assert cuerpo["meta"]["request_id"]
    assert cuerpo["errors"][0]["code"]


# ---------------------------------------------------------------------------
# Los demás límites siguen en pie sobre el almacén nuevo
# ---------------------------------------------------------------------------


def test_el_limite_de_la_api_publica_sigue_activo_y_es_compartido(almacen_limpio):
    """100/min por defecto: se comprueba que decrementa ENTRE procesos.

    Se mira el contador en vez de lanzar 101 peticiones: lo que hay que
    demostrar es que el segundo proceso continúa la cuenta del primero, no que
    el número 100 sea 100 —eso no lo cambia esta fase—.
    """
    primero = _en_proceso_aparte_publico(ALMACEN, 3)
    segundo = _en_proceso_aparte_publico(ALMACEN, 1)

    assert primero["cabeceras"].get("X-RateLimit-Limit") == "100"
    restante_primero = int(primero["cabeceras"]["X-RateLimit-Remaining"])
    restante_segundo = int(segundo["cabeceras"]["X-RateLimit-Remaining"])

    # El segundo proceso ve el consumo del primero: 3 + 1 gastadas.
    assert restante_primero == 97
    assert restante_segundo == 96


def _worker_publico(almacen: str, intentos: int, ip: str, cola):
    """Igual que `_worker`, contra un endpoint público (límite por defecto)."""
    try:

        class Config(TestingConfig):
            RATELIMIT_ENABLED = True
            RATELIMIT_STORAGE_URI = almacen

        aplicacion = create_app(Config)
        with aplicacion.app_context():
            db.engine.dispose()

        cliente = aplicacion.test_client()
        codigos, cabeceras = [], {}
        for _ in range(intentos):
            respuesta = cliente.get("/api/v1/brands", environ_overrides={"REMOTE_ADDR": ip})
            codigos.append(respuesta.status_code)
            cabeceras = dict(respuesta.headers)
        cola.put({"codigos": codigos, "cabeceras": cabeceras})
    except Exception as error:  # pragma: no cover
        cola.put({"error": f"{type(error).__name__}: {error}"})


def _en_proceso_aparte_publico(almacen: str, intentos: int, ip: str = "203.0.113.20") -> dict:
    contexto = multiprocessing.get_context("fork")
    cola = contexto.Queue()
    proceso = contexto.Process(target=_worker_publico, args=(almacen, intentos, ip, cola))
    proceso.start()
    resultado = cola.get(timeout=60)
    proceso.join(timeout=30)
    assert "error" not in resultado, resultado.get("error")
    return resultado
