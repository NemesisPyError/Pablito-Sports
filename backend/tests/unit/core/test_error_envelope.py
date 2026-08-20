"""Global error handling and the AD-16 envelope (ERR-01 to ERR-05, 05_API.md §11)."""

import pytest

from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    BusinessRuleError,
    NotFoundError,
    RequestValidationError,
)

ENVELOPE_KEYS = {"success", "data", "errors", "meta"}
ERROR_KEYS = {"code", "rule", "detail", "field"}


@pytest.fixture
def app_with_probe_routes(app):
    """Routes that raise on demand, so the handlers can be exercised end to end."""

    @app.get("/__probe/boom")
    def _boom():
        raise RuntimeError("database password is hunter2")

    @app.post("/__probe/echo")
    def _echo():
        from flask import request

        return {"received": request.get_json()}

    @app.get("/__probe/rule")
    def _rule():
        raise BusinessRuleError("brand has associated products", rule="RN-68", field="brand")

    @app.get("/__probe/validation")
    def _validation():
        raise RequestValidationError(
            [
                {"field": "list_price", "detail": "list_price must be a positive integer"},
                {
                    "field": "availability",
                    "detail": "availability must be one of the allowed values",
                },
            ]
        )

    return app


@pytest.fixture
def probe_client(app_with_probe_routes):
    return app_with_probe_routes.test_client()


def _assert_error_envelope(payload, status_code):
    assert set(payload) == ENVELOPE_KEYS
    assert payload["success"] is False
    assert payload["data"] is None
    assert isinstance(payload["errors"], list) and payload["errors"]
    assert payload["meta"]["request_id"]
    for error in payload["errors"]:
        assert set(error) >= ERROR_KEYS
    assert status_code >= 400


def test_404_uses_the_ad16_envelope(client):
    response = client.get("/api/v1/does-not-exist")

    _assert_error_envelope(response.get_json(), response.status_code)
    assert response.status_code == 404
    assert response.get_json()["errors"][0]["code"] == "resource_not_found"


def test_400_on_malformed_json_uses_the_ad16_envelope(probe_client):
    response = probe_client.post("/__probe/echo", data="{not json", content_type="application/json")

    _assert_error_envelope(response.get_json(), response.status_code)
    assert response.status_code == 400
    assert response.get_json()["errors"][0]["code"] == "malformed_request"


def test_500_uses_the_ad16_envelope(probe_client):
    response = probe_client.get("/__probe/boom")

    _assert_error_envelope(response.get_json(), response.status_code)
    assert response.status_code == 500
    assert response.get_json()["errors"][0]["code"] == "internal_server_error"


def test_500_never_leaks_internals(probe_client):
    # ERR-04 and 03_SEGURIDAD.md §16.1.
    response = probe_client.get("/__probe/boom")
    body = response.get_data(as_text=True)

    assert "hunter2" not in body
    assert "Traceback" not in body
    assert "RuntimeError" not in body


def test_business_rule_error_carries_the_violated_rule(probe_client):
    response = probe_client.get("/__probe/rule")
    error = response.get_json()["errors"][0]

    # ERR-03: a 409 always names the RN-xx that was violated.
    assert response.status_code == 409
    assert error["code"] == "business_rule_violation"
    assert error["rule"] == "RN-68"
    assert error["field"] == "brand"


def test_business_rule_error_cannot_be_raised_without_a_rule():
    with pytest.raises(ValueError):
        BusinessRuleError("something went wrong")


def test_validation_error_reports_one_entry_per_field(probe_client):
    response = probe_client.get("/__probe/validation")
    errors = response.get_json()["errors"]

    assert response.status_code == 422
    assert [error["field"] for error in errors] == ["list_price", "availability"]
    assert {error["code"] for error in errors} == {"validation_error"}


def test_error_codes_match_the_api_contract():
    # 05_API.md §11.1 owns the wire codes.
    assert (AuthenticationError.status_code, AuthenticationError.code) == (
        401,
        "authentication_required",
    )
    assert (AuthorizationError.status_code, AuthorizationError.code) == (
        403,
        "insufficient_privileges",
    )
    assert (NotFoundError.status_code, NotFoundError.code) == (404, "resource_not_found")


def test_request_id_is_echoed_in_header_and_meta(client):
    response = client.get("/api/v1/does-not-exist")

    assert response.headers["X-Request-Id"]
    assert response.get_json()["meta"]["request_id"] == response.headers["X-Request-Id"]


def test_upstream_request_id_is_propagated(client):
    response = client.get("/api/v1/does-not-exist", headers={"X-Request-Id": "trace-123"})

    assert response.get_json()["meta"]["request_id"] == "trace-123"


@pytest.mark.parametrize(
    "hostile",
    [
        "<script>alert(1)</script>",
        "id with spaces",
        "x" * 200,
        "",
    ],
)
def test_unsafe_upstream_request_id_is_replaced(client, hostile):
    # An upstream value is echoed back in a header and written to logs, so it is
    # only reused when it matches a strict allowlist.
    response = client.get("/api/v1/does-not-exist", headers={"X-Request-Id": hostile})

    request_id = response.get_json()["meta"]["request_id"]
    assert request_id != hostile
    assert request_id == response.headers["X-Request-Id"]
    assert len(request_id) == 8
