"""Password hashing (03_SEGURIDAD.md §5.5).

bcrypt con coste >= 12. Solo se almacena el hash; la contraseña en texto plano
nunca se persiste ni se registra (§5.5, §16.3).
"""

import bcrypt

# §5.5: coste mínimo 12.
BCRYPT_ROUNDS = 12

# §5.5: política mínima de 8 caracteres.
MIN_PASSWORD_LENGTH = 8


def hash_password(password: str) -> str:
    """Devuelve el hash bcrypt de la contraseña, con sal generada por el algoritmo."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Comprueba una contraseña contra su hash en tiempo constante.

    Un hash malformado devuelve False en lugar de propagar: un registro corrupto
    no debe convertirse en un 500 que revele el estado interno (ERR-04).
    """
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def meets_policy(password: str) -> bool:
    """§5.5: mínimo 8 caracteres."""
    return isinstance(password, str) and len(password) >= MIN_PASSWORD_LENGTH
