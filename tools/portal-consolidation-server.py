"""Combined SaaS review on the existing loopback Test origin; no database changes."""
import argparse
import importlib.util
from pathlib import Path
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location('portal_test', Path(__file__).with_name('bcm-ai-portal-server.py'))
portal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(portal)
# Keep the established Test identity/project and paid-research safety settings.
# This flag displays the already-installed Watch UI; it starts no monitoring jobs.
portal.TEST_CONFIG += b'\nwindow.VB_WATCH_ENABLED=true;\n'

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8893)
    args = parser.parse_args()
    ThreadingHTTPServer(('127.0.0.1', args.port), portal.TestPortalHandler).serve_forever()
