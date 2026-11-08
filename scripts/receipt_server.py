"""Serve the Meal Plan app over loopback for local development."""

from http.server import (
    SimpleHTTPRequestHandler,
    ThreadingHTTPServer,
)
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
HOST = "127.0.0.1"
PORT = 8001


class LocalReceiptServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False


class ReceiptRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)


def main() -> None:
    server = LocalReceiptServer((HOST, PORT), ReceiptRequestHandler)
    print(f"Serving Meal Plan at http://localhost:{PORT}/ (local machine only)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Meal Plan server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
