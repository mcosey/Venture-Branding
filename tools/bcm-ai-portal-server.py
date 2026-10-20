"""Loopback-only Test portal. Uses installed Python; never edits Production config."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
TEST_CONFIG = b"""// Browser-safe Test configuration; no secret keys.
window.VB_AUTH_CONFIG=Object.freeze({environment:'bcm-test',memberAccountsEnabled:true,url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_QsbJJKAKHHC8M3Zt9cCgAA_PM3jbAfC',allowBcmResearch:false});
window.VB_EVIDENCE_ENABLED=false;window.VB_DIGEST_ENABLED=false;window.VB_DIGEST_SCHEDULED=false;
"""
LANDING = b"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Venture Branding - Test portal</title><link rel="stylesheet" href="/auth/auth.css"><body><main><div class="card"><h1>Venture Branding Test portal</h1><p>Existing portal screens connected only to fictional Test records. Paid research is disabled. Production is unchanged.</p><p><a href="/brand-monitor.html">Open client BCM</a></p><p><a href="/login.html">Client sign in</a></p><p><a href="/attorney.html">Open attorney workspace</a></p><p><a href="/attorney-login.html">Attorney sign in</a></p></div></main></body></html>"""

class TestPortalHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/auth/config.js':
            return self.send_bytes(TEST_CONFIG, 'text/javascript; charset=utf-8')
        if path in ('/', '/tools/bcm-ai-portal-test/'):
            return self.send_bytes(LANDING, 'text/html; charset=utf-8')
        file = Path(self.translate_path(self.path)).resolve()
        if not file.is_relative_to(ROOT) or any(part.startswith('.') for part in file.relative_to(ROOT).parts):
            return self.send_error(404)
        if file.suffix == '.html' and file.is_file():
            html = file.read_text()
            import re
            html = re.sub(r'src="auth/config\.js[^"]*"', 'src="/auth/config.js?v=bcm-ai-portal-test"', html)
            html = html.replace('src="portal/assets/client.js?', 'src="portal/assets/client.js?bcm-test=1&').replace('src="attorney/assets/workspace.js?', 'src="attorney/assets/workspace.js?bcm-test=1&')
            # These are presentation assets only; the normal Production pages stay unchanged.
            html = html.replace('</head>', '<link rel="stylesheet" href="/portal/assets/brand-monitor.css"><link rel="stylesheet" href="/portal/assets/bcm-ai.css"></head>')
            return self.send_bytes(html.encode(), 'text/html; charset=utf-8')
        return super().do_GET()

    def send_bytes(self, data, content_type):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

if __name__ == '__main__':
    # Same origin as the prior Test review, so its existing private client session can resume.
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8885)
    args = parser.parse_args()
    ThreadingHTTPServer(('127.0.0.1', args.port), TestPortalHandler).serve_forever()
