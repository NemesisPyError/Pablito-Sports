"""Public Superdescuentos rules: active banks, ordered by position."""

from ..dtos.catalog_dtos import BankDTO
from ..mappers.catalog_mappers import bank_to_dto
from ..repositories.bank_repository import BankRepository


class BankService:
    @staticmethod
    def list_public() -> list[BankDTO]:
        return [bank_to_dto(bank) for bank in BankRepository.list_active()]
