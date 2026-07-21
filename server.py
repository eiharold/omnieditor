#!/usr/bin/env python3
"""Servidor de desenvolvimento do OmniEditor (sem cache)."""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5588


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
        print(f'OmniEditor em http://localhost:{PORT}')
        httpd.serve_forever()
