import os

from flask import Flask

from mhq.clustox_auth.internal_token import register_internal_token_guard


def build_app(token):
    if token is None:
        os.environ.pop("INTERNAL_API_TOKEN", None)
    else:
        os.environ["INTERNAL_API_TOKEN"] = token

    app = Flask(__name__)
    register_internal_token_guard(app)

    @app.route("/protected")
    def protected():
        return {"ok": True}

    @app.route("/")
    def health():
        return "hello"

    return app


def test_request_with_valid_token_is_allowed():
    app = build_app("secret-token")
    client = app.test_client()
    res = client.get("/protected", headers={"X-Internal-Token": "secret-token"})
    assert res.status_code == 200


def test_request_without_token_is_rejected():
    app = build_app("secret-token")
    res = app.test_client().get("/protected")
    assert res.status_code == 403


def test_request_with_wrong_token_is_rejected():
    app = build_app("secret-token")
    client = app.test_client()
    res = client.get("/protected", headers={"X-Internal-Token": "wrong"})
    assert res.status_code == 403


def test_unset_env_fails_closed():
    """An unconfigured token must reject everything, never allow everything."""
    app = build_app(None)
    client = app.test_client()
    res = client.get("/protected", headers={"X-Internal-Token": "anything"})
    assert res.status_code == 403


def test_health_endpoint_is_exempt():
    app = build_app("secret-token")
    res = app.test_client().get("/")
    assert res.status_code == 200
