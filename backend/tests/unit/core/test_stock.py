"""Regla de disponibilidad derivada de la cantidad (RN-38b, v1.4.0)."""

import pytest

from app.core.utils.stock import AVAILABLE, LOW_STOCK, OUT_OF_STOCK, derive_availability


@pytest.mark.parametrize(
    ("cantidad", "esperado"),
    [
        (0, OUT_OF_STOCK),
        (1, LOW_STOCK),
        (5, LOW_STOCK),
        (6, AVAILABLE),
        (100, AVAILABLE),
    ],
    ids=["cero", "uno", "cinco", "seis", "cien"],
)
def test_regla_exacta(cantidad, esperado):
    assert derive_availability(cantidad) == esperado
