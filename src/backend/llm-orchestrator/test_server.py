"""
Local test server — generates LiveKit tokens + serves test UI.
Usage: python test_server.py
Then open http://localhost:3000
"""

from dotenv import load_dotenv
import os

_env = os.getenv("ENV", "local")
load_dotenv(f"envs/.env.{_env}")

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import uuid
from datetime import timedelta

from livekit.api import AccessToken, VideoGrants


API_KEY = os.getenv("LIVEKIT_API_KEY", "")
API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")

HTML = open(os.path.join(os.path.dirname(__file__), "test_client.html")).read()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[test-server] {fmt % args}")

    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML.encode())

        elif self.path.startswith("/token"):
            room = f"driver-call-test-{uuid.uuid4().hex[:6]}"
            identity = f"browser-tester-{uuid.uuid4().hex[:6]}"

            token = (
                AccessToken(API_KEY, API_SECRET)
                .with_identity(identity)
                .with_name("Browser Tester")
                .with_grants(VideoGrants(room_join=True, room=room))
                .with_ttl(timedelta(hours=1))
                .to_jwt()
            )

            payload = json.dumps(
                {"token": token, "url": LIVEKIT_URL, "room": room, "identity": identity}
            ).encode()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(payload)

        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    if not API_KEY or not API_SECRET:
        raise SystemExit("LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set — check envs/.env.local")

    server = HTTPServer(("0.0.0.0", 8888), Handler)
    print(f"Test server: http://localhost:8888")
    print(f"LiveKit URL: {LIVEKIT_URL}")
    server.serve_forever()
