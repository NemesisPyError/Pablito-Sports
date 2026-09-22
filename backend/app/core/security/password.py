"""Password hashing y política (03_SEGURIDAD.md §5.5).

bcrypt con coste >= 12. Solo se almacena el hash; la contraseña en texto plano
nunca se persiste ni se registra (§5.5, §16.3).

**Criterio de la política.** Se sigue NIST SP 800-63B: lo que protege es la
longitud y descartar lo ya conocido, no las reglas de composición. Por eso
**no** se exige mayúscula, dígito ni símbolo: esas reglas empujan a la gente
hacia `Password1!` —que está en cualquier diccionario— y no aportan entropía
real. Lo que sí se exige es un mínimo largo, un tope, y el rechazo de las
contraseñas triviales.

La política solo se aplica al **fijar** una contraseña (alta y cambio). El
inicio de sesión no la consulta: endurecerla no deja fuera a nadie que ya tenga
cuenta.
"""

import bcrypt

# §5.5: coste mínimo 12.
BCRYPT_ROUNDS = 12

# §5.5. Sube de 8 a 12: estas son cuentas de panel, y la única barrera contra el
# intento en línea es el límite de 5 por IP cada 15 minutos. Doce caracteres es
# el mínimo que NIST recomienda cuando no hay segundo factor.
MIN_PASSWORD_LENGTH = 12

# bcrypt **trunca en silencio** todo lo que pase de 72 bytes: dos contraseñas
# distintas que compartan ese prefijo producen el mismo hash y ambas validan.
# Comprobado con bcrypt 4.2.1, que no lanza ningún error al respecto. Se rechaza
# antes de llegar al algoritmo, para que nadie crea tener más contraseña de la
# que realmente se está usando. El límite es en BYTES, no en caracteres: una
# tilde o una eñe ocupan dos.
MAX_PASSWORD_BYTES = 72

# Contraseñas que un ataque por diccionario prueba en sus primeros intentos. La
# lista es corta a propósito: no pretende ser exhaustiva —eso exigiría una base
# de filtradas y una dependencia nueva— sino cerrar lo evidente. Incluye los
# términos del propio negocio, que son los que a alguien se le ocurren primero
# al crear la cuenta del panel.
_TRIVIALES = frozenset(
    {
        "password",
        "passw0rd",
        "contrasena",
        "contraseña",
        "123456789012",
        "1234567890123",
        "administrador",
        "administrator",
        "adminadmin",
        "admin1234567",
        "qwertyuiop12",
        "pablitosports",
        "pablito sports",
        "pablitosports1",
        "sportspablito",
        "tiendapablito",
        "letmein12345",
        "iloveyou1234",
        "welcome12345",
        "bienvenido12",
        "deportes1234",
        "paraguay1234",
        "trinidad1234",
    }
)

# Secuencias de las que se derivan la mayoría de las contraseñas «de relleno».
_SECUENCIAS = (
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
)


def hash_password(password: str) -> str:
    """Devuelve el hash bcrypt de la contraseña, con sal generada por el algoritmo."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Comprueba una contraseña contra su hash en tiempo constante.

    Un hash malformado devuelve False en lugar de propagar: un registro corrupto
    no debe convertirse en un 500 que revele el estado interno (ERR-04).

    **No consulta la política**: una cuenta creada bajo la política anterior
    sigue entrando con su contraseña de siempre.
    """
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _es_secuencia(normalizada: str) -> bool:
    """`12345678`, `abcdefghijkl`, `qwertyuiop12` y sus inversas."""
    for secuencia in _SECUENCIAS:
        if normalizada in secuencia or normalizada in secuencia[::-1]:
            return True
    return False


def policy_violation(password) -> str | None:
    """Motivo por el que la contraseña no sirve, o `None` si sirve.

    Devuelve el motivo en vez de un booleano para que el mensaje de error diga
    qué corregir. Ninguno de los motivos revela nada sobre otras cuentas ni
    sobre la contraseña anterior.
    """
    if not isinstance(password, str) or not password:
        return "password is required"

    if len(password) < MIN_PASSWORD_LENGTH:
        return f"password must be at least {MIN_PASSWORD_LENGTH} characters"

    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        # Ver `MAX_PASSWORD_BYTES`: por encima, bcrypt ignoraría el resto.
        return f"password must be at most {MAX_PASSWORD_BYTES} bytes"

    normalizada = password.strip().lower()

    if normalizada in _TRIVIALES:
        return "password is too common; choose a less predictable one"

    if len(set(normalizada)) == 1:
        return "password cannot be a single repeated character"

    if _es_secuencia(normalizada):
        return "password cannot be a simple keyboard or alphabet sequence"

    return None


def meets_policy(password: str) -> bool:
    """§5.5: la contraseña cumple la política vigente."""
    return policy_violation(password) is None
