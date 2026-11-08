"""Serve the Meal Plan app over loopback for local development."""

import errno
import sys
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
    try:
        server = LocalReceiptServer((HOST, PORT), ReceiptRequestHandler)
    except OSError as error:
        if error.errno == errno.EADDRINUSE or getattr(error, "winerror", None) == 10048:
            print(
                f"Could not start the Meal Plan server: port {PORT} is already in use.\n"
                f"Open the existing server at http://localhost:{PORT}/, or stop it "
                "with Ctrl+C in the terminal where it is running."
            )
            sys.exit(1)
        raise

    print(f"Serving Meal Plan at http://localhost:{PORT}/ (local machine only)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Meal Plan server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
