#!/usr/bin/env python3
"""
nuclei scanner moving target

phase1 - should report x-frame-options, does not report readme-md
phase2 - should not report x-frame-options, should report readme-md
"""

import sys
from argparse import ArgumentParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class CustomHTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_notallowed(self):
        self.send_response(405)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"405 Method Not Allowed\n")

    def do_GET(self):
        self.do_notallowed()

    def do_HEAD(self):
        self.do_notallowed()

    def do_POST(self):
        self.do_notallowed()

    def do_PUT(self):
        self.do_notallowed()

    def do_DELETE(self):
        self.do_notallowed()


class HandlerPhase1(CustomHTTPRequestHandler):
    """phase1"""

    def do_GET(self):
        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"not found")
        return


class HandlerPhase2(CustomHTTPRequestHandler):
    """phase2"""

    def end_headers(self):
        self.send_header("X-Frame-Options", "origin")
        super().end_headers()

    def do_GET(self):
        if self.path == "/README.md":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"## readme present")
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"not found")
        return


def main():
    """main"""

    parser = ArgumentParser()
    parser.add_argument("phase", nargs="?", choices=["phase1", "phase2"], default="phase1")
    args = parser.parse_args()

    server_address = ('127.0.0.7', 80)
    httpd = ThreadingHTTPServer(
        server_address,
        HandlerPhase2 if args.phase == "phase2" else HandlerPhase1
    )
    print(f"Serving on {server_address} ...")
    httpd.serve_forever()


if __name__ == '__main__':
    sys.exit(main())
