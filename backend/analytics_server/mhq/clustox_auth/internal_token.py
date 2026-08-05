"""
CLUSTOX: restrict the Flask servers to traffic from the Next.js BFF.

Upstream ships these APIs unauthenticated, relying on the loopback port binding
in docker-compose. Once authorization lives in the BFF, a direct call to :9696
would bypass every check, so every request must carry a shared secret.

Fails closed: if INTERNAL_API_TOKEN is unset, all requests are rejected.
"""

import hmac
from os import getenv

from flask import Flask, jsonify, request

HEADER = "X-Internal-Token"

# Health checks must stay reachable for container and UI status probes.
EXEMPT_PATHS = {"/"}


def register_internal_token_guard(app: Flask) -> None:
    @app.before_request
    def _verify_internal_token():
        if request.path in EXEMPT_PATHS:
            return None

        expected = getenv("INTERNAL_API_TOKEN")
        if not expected:
            return jsonify({"error": "internal token not configured"}), 403

        provided = request.headers.get(HEADER, "")
        # compare_digest avoids leaking the token through response timing.
        if not hmac.compare_digest(provided, expected):
            return jsonify({"error": "forbidden"}), 403

        return None
