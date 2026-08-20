"""Dashboard del panel (05_API.md §9.2, §10.8; `RF-38`, `RF-39`, `CU-A-03`).

07_PANEL_ADMIN.md §14.1: *"Ofrecer una vista rápida del estado del catálogo y
destacar productos que requieren atención."* El dashboard **no introduce reglas
propias**: agrega lo que otras ya definen. La vigencia de ofertas y promociones
la resuelve `ProductRepository` (`RN-30` a `RN-37`) y el historial de precios es
el de `RN-70`.

Solo lectura: no abre transacción (10_BACKEND.md §14.1 regla 3).
"""

from datetime import UTC, datetime

from ..dtos.admin_dtos import DashboardDTO, DashboardTotalsDTO, IncompleteProductDTO
from ..mappers.admin_mappers import price_history_to_dto
from ..repositories.dashboard_repository import DashboardRepository
from ..repositories.price_history_repository import PriceHistoryRepository

# §10.8 declara `incomplete_products` y `recent_price_changes` como listas, la
# segunda "opcional, limitado", sin fijar cuántos elementos. Son alertas de una
# pantalla de resumen: se acotan para que el dashboard no degrade cuando el
# catálogo crezca (`RNF-01`). Los valores son de implementación, no de contrato.
MAX_INCOMPLETE_PRODUCTS = 20
MAX_RECENT_PRICE_CHANGES = 10


class AdminDashboardService:
    @classmethod
    def build(cls, moment: datetime | None = None) -> DashboardDTO:
        """§9.2. Devuelve el `DashboardDTO` completo.

        `moment` permite fijar el instante de evaluación de la vigencia. Por
        defecto es ahora en UTC (`AD-34`): `RN-34` evalúa contra el reloj de la
        tienda y las marcas se guardan como instantes absolutos, de modo que
        comparar en UTC es equivalente.
        """
        ahora = moment or datetime.now(UTC)

        return DashboardDTO(
            totals=cls._totals(ahora),
            incomplete_products=cls._incomplete_products(),
            recent_price_changes=cls._recent_price_changes(),
        )

    @classmethod
    def _totals(cls, moment: datetime) -> DashboardTotalsDTO:
        """`RF-38`: activos, ocultos, por disponibilidad y en oferta vigente."""
        por_disponibilidad = DashboardRepository.count_by_availability()

        return DashboardTotalsDTO(
            total=DashboardRepository.count_products(),
            active=DashboardRepository.count_by_active(is_active=True),
            hidden=DashboardRepository.count_by_active(is_active=False),
            available=por_disponibilidad["available"],
            low_stock=por_disponibilidad["low_stock"],
            out_of_stock=por_disponibilidad["out_of_stock"],
            on_sale=DashboardRepository.count_on_sale(moment),
        )

    @classmethod
    def _incomplete_products(cls) -> list[IncompleteProductDTO]:
        """`RF-39`: señala los productos sin imagen, sin precio o sin categoría.

        `missing` lleva solo las carencias reales de cada producto, en el orden
        del contrato (`image`, `price`, `category`).
        """
        productos = DashboardRepository.list_incomplete(MAX_INCOMPLETE_PRODUCTS)

        incompletos = []
        for identificador, slug, nombre, sin_imagen, sin_precio, sin_categoria in productos:
            faltantes = []
            if sin_imagen:
                faltantes.append("image")
            if sin_precio:
                faltantes.append("price")
            if sin_categoria:
                faltantes.append("category")
            incompletos.append(
                IncompleteProductDTO(id=identificador, slug=slug, name=nombre, missing=faltantes)
            )
        return incompletos

    @classmethod
    def _recent_price_changes(cls) -> list:
        """§10.8: últimos cambios de precio. Reutiliza `PriceHistoryDTO` (§10.12).

        El repositorio ya ordena del más reciente al más antiguo, que es lo que
        "recientes" significa en una pantalla de resumen.
        """
        entradas = PriceHistoryRepository.list_all(offset=0, limit=MAX_RECENT_PRICE_CHANGES)
        return [price_history_to_dto(entrada) for entrada in entradas]
