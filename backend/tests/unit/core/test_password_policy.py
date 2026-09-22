"""Política de contraseñas del panel (03_SEGURIDAD.md §5.5).

La debilidad que corrige esta suite: la política era `len(password) >= 8` y nada
más. Ocho caracteres es poco para la cuenta más privilegiada del sistema, no se
rechazaba ninguna contraseña trivial —`12345678` y `password` pasaban— y no
había tope superior, cosa que importa porque **bcrypt trunca en silencio a 72
bytes**: dos contraseñas distintas que compartan ese prefijo producen el mismo
hash y ambas validan.

El criterio es el de NIST SP 800-63B: longitud y descartar lo conocido. **No** se
exigen reglas de composición (mayúscula, dígito, símbolo) a propósito: empujan
hacia `Password1!`, que está en cualquier diccionario, sin sumar entropía real.
"""

import bcrypt
import pytest

from app.core.security.password import (
    BCRYPT_ROUNDS,
    MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
    hash_password,
    meets_policy,
    policy_violation,
    verify_password,
)

VALIDA = "caballo-correcto-bateria"


# ---------------------------------------------------------------------------
# Longitud
# ---------------------------------------------------------------------------


def test_una_contrasena_larga_y_no_trivial_se_acepta():
    assert policy_violation(VALIDA) is None
    assert meets_policy(VALIDA) is True


def test_el_minimo_es_doce_caracteres():
    assert MIN_PASSWORD_LENGTH == 12


@pytest.mark.parametrize("password", ["", "a", "corta", "once-caract"])
def test_se_rechaza_lo_que_no_llega_al_minimo(password):
    assert policy_violation(password) is not None


def test_el_borde_exacto_del_minimo_se_acepta():
    """Doce sirve; once no. El límite es el que dice la política, no uno más."""
    justa = "abcdefghijkm"  # 12, sin ser secuencia
    assert len(justa) == MIN_PASSWORD_LENGTH
    assert policy_violation(justa) is None
    assert policy_violation(justa[:-1]) is not None


# ---------------------------------------------------------------------------
# Tope superior: la truncación silenciosa de bcrypt
# ---------------------------------------------------------------------------


def test_bcrypt_trunca_a_72_bytes_y_por_eso_existe_el_tope():
    """Demuestra el motivo del límite en vez de solo afirmarlo.

    Con 80 bytes, bcrypt no protesta: hashea los primeros 72 y descarta el
    resto. Otra contraseña distinta con el mismo prefijo valida contra ese hash.
    """
    larga = "A" * 80
    hash_ = bcrypt.hashpw(larga.encode(), bcrypt.gensalt(rounds=4))
    otra_distinta = "A" * 72 + "ESTO-ES-OTRA-COSA"

    assert bcrypt.checkpw(otra_distinta.encode(), hash_) is True


def test_se_rechaza_lo_que_supera_el_tope_de_bcrypt():
    assert policy_violation("a" * (MAX_PASSWORD_BYTES + 1)) is not None


def test_el_tope_se_mide_en_bytes_no_en_caracteres():
    """Una eñe ocupa dos bytes: 40 caracteres pueden pasarse de 72."""
    cuarenta_enes = "ñ" * 40
    assert len(cuarenta_enes) == 40
    assert len(cuarenta_enes.encode("utf-8")) == 80

    assert policy_violation(cuarenta_enes) is not None


def test_el_borde_exacto_del_tope_se_acepta():
    # Variada a propósito: `"a" * 72` chocaría con la regla del carácter
    # repetido y no probaría el borde del tope.
    justa = ("brisa-marina-" * 6)[:MAX_PASSWORD_BYTES]
    assert len(justa.encode("utf-8")) == MAX_PASSWORD_BYTES
    assert policy_violation(justa) is None


# ---------------------------------------------------------------------------
# Triviales
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "password",
    [
        "password",
        "PASSWORD",
        "administrador",
        "pablitosports",
        "PablitoSports",
        "123456789012",
        "abcdefghijkl",
        "qwertyuiop12",
        "aaaaaaaaaaaa",
    ],
)
def test_se_rechazan_las_contrasenas_triviales(password):
    """Lo primero que prueba un ataque por diccionario."""
    assert policy_violation(password) is not None, password


def test_el_rechazo_de_triviales_no_distingue_mayusculas_ni_espacios():
    assert policy_violation("  PabLitoSports  ") is not None


def test_no_se_exigen_reglas_de_composicion():
    """NIST SP 800-63B: la composición obligatoria no se pide, a propósito.

    Una contraseña larga, en minúsculas y sin dígitos ni símbolos es válida.
    """
    assert policy_violation("brisa marina temprana") is None


def test_el_motivo_explica_que_corregir_sin_revelar_nada():
    corta = policy_violation("corta")
    # Trivial de 13 caracteres: si fuera más corta se rechazaría por longitud
    # antes de llegar a la lista, y el motivo no sería el que se quiere probar.
    trivial = policy_violation("pablitosports")

    assert str(MIN_PASSWORD_LENGTH) in corta
    assert "common" in trivial
    # El motivo no repite la contraseña rechazada.
    assert "corta" not in corta.replace("characters", "")


# ---------------------------------------------------------------------------
# bcrypt sigue siendo el mecanismo
# ---------------------------------------------------------------------------


def test_el_hash_sigue_siendo_bcrypt_con_coste_12():
    assert BCRYPT_ROUNDS == 12
    hash_ = hash_password(VALIDA)

    # `$2b$12$...`: identificador del algoritmo y coste, en el propio hash.
    assert hash_.startswith("$2b$12$")
    assert hash_ != VALIDA


def test_el_hash_lleva_sal_distinta_cada_vez():
    assert hash_password(VALIDA) != hash_password(VALIDA)


def test_verify_password_acepta_la_correcta_y_rechaza_la_otra():
    hash_ = hash_password(VALIDA)

    assert verify_password(VALIDA, hash_) is True
    assert verify_password("otra-cosa-larga-distinta", hash_) is False


def test_una_contrasena_vieja_de_ocho_caracteres_sigue_entrando():
    """No se expulsa a nadie: la política solo aplica al FIJAR la contraseña.

    Una cuenta creada bajo la política anterior conserva su hash, y el inicio de
    sesión no consulta la política. Endurecerla no obliga a nadie a cambiarla.
    """
    vieja = "8caracte"
    assert len(vieja) == 8
    assert policy_violation(vieja) is not None  # ya no se podría FIJAR

    hash_ = hash_password(vieja)
    assert verify_password(vieja, hash_) is True  # pero SÍ se puede usar
