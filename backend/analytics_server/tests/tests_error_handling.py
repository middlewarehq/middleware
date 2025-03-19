import unittest
import json
from werkzeug.exceptions import NotFound, BadRequest

from flask import Flask, jsonify, request

flask_app = Flask(__name__)


@flask_app.errorhandler(Exception)
def handle_exception(e):
    """Handle non-HTTP exceptions by returning JSON"""
    error_details = {
        "error": str(e) or "Internal Server Error",
        "status_code": 500,
        "path": request.path,
        "exception_type": e.__class__.__name__,
    }
    if flask_app.debug:
        import traceback

        error_details["traceback"] = traceback.format_exc()
    response = jsonify(error_details)
    response.status_code = 500
    return response


@flask_app.errorhandler(NotFound)
@flask_app.errorhandler(BadRequest)
def handle_http_exception(e):
    """Handle HTTP exceptions by returning JSON"""
    response = jsonify(
        {"error": e.description, "status_code": e.code, "path": request.path}
    )
    response.status_code = e.code
    return response


# Added test routes
@flask_app.route("/test-bad-request")
def bad_request_endpoint():
    raise BadRequest("Invalid input")


@flask_app.route("/test-exception")
def exception_endpoint():
    raise ValueError("Something went wrong")


@flask_app.route("/test-debug-exception")
def debug_exception_endpoint():
    raise ValueError("Debug exception")


@flask_app.route("/test-prod-exception")
def prod_exception_endpoint():
    raise ValueError("Production exception")


class TestErrorHandlers(unittest.TestCase):

    def setUp(self):
        self.app = flask_app.test_client()
        flask_app.config["TESTING"] = True
        flask_app.config["DEBUG"] = False

    def test_http_exception_handler_404(self):
        """Test handling of 404 Not Found exception"""
        response = self.app.get("/non-existent-endpoint")

        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertEqual(data["status_code"], 404)
        self.assertEqual(data["path"], "/non-existent-endpoint")

    def test_http_exception_handler_400(self):
        """Test handling of 400 Bad Request exception"""
        response = self.app.get("/test-bad-request")

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertEqual(data["status_code"], 400)
        self.assertEqual(data["path"], "/test-bad-request")
        self.assertEqual(data["error"], "Invalid input")

    def test_general_exception_handler(self):
        """Test handling of general exceptions"""
        response = self.app.get("/test-exception")

        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn("error", data)
        self.assertEqual(data["status_code"], 500)
        self.assertEqual(data["path"], "/test-exception")
        self.assertEqual(data["exception_type"], "ValueError")
        self.assertEqual(data["error"], "Something went wrong")

    def test_debug_mode_traceback(self):
        """Test that traceback is included in debug mode"""
        flask_app.config["DEBUG"] = True

        response = self.app.get("/test-debug-exception")

        data = json.loads(response.data)
        self.assertIn("traceback", data)
        self.assertTrue(len(data["traceback"]) > 0)

        flask_app.config["DEBUG"] = False

    def test_no_traceback_in_production(self):
        """Test that traceback is not included when not in debug mode"""
        flask_app.config["DEBUG"] = False
        response = self.app.get("/test-prod-exception")
        data = json.loads(response.data)
        self.assertNotIn("traceback", data)


if __name__ == "__main__":
    unittest.main()
