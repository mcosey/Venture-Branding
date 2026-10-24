"""Loopback SaaS preview. Test remains the default; main must be selected explicitly."""
import argparse
import importlib.util
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

spec = importlib.util.spec_from_file_location('portal_test', Path(__file__).with_name('bcm-ai-portal-server.py'))
portal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(portal)
# Keep the established Test identity/project and paid-research safety settings.
# This flag displays the already-installed Watch UI; it starts no monitoring jobs.
portal.TEST_CONFIG += b'\nwindow.VB_WATCH_ENABLED=true;\n'

class MainPortalHandler(portal.TestPortalHandler):
    """Serve this checkout's main configuration without Test substitutions."""
    def do_GET(self):
        path = urlsplit(self.path).path
        file = Path(self.translate_path(self.path)).resolve()
        if not file.is_relative_to(portal.ROOT) or any(
            part.startswith('.') for part in file.relative_to(portal.ROOT).parts
        ):
            return self.send_error(404)
        if path == '/auth/config.js':
            return self.send_bytes(file.read_bytes(), 'text/javascript; charset=utf-8')
        return SimpleHTTPRequestHandler.do_GET(self)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8893)
    parser.add_argument('--environment', choices=['bcm-test', 'bcm-production'], default='bcm-test')
    args = parser.parse_args()
    if args.environment == 'bcm-production' and args.port != 8895:
        parser.error('The reviewed main preview origin uses port 8895.')
    handler = MainPortalHandler if args.environment == 'bcm-production' else portal.TestPortalHandler
    ThreadingHTTPServer(('127.0.0.1', args.port), handler).serve_forever()
