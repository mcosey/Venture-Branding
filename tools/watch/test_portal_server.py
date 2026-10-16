"""Loopback-only connected Watch Test view; never changes Production configuration."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json
import re

ROOT = Path(__file__).resolve().parents[2]
CONFIG = b"""// Browser-safe Test public key only; no private credentials.
window.VB_AUTH_CONFIG=Object.freeze({environment:'bcm-test',url:'https://imvkhicfmidzbzsbhkzs.supabase.co',publishableKey:'sb_publishable_QsbJJKAKHHC8M3Zt9cCgAA_PM3jbAfC',bcmEnabled:false,allowBcmResearch:false});
window.VB_WATCH_ENABLED=true;
window.VB_EVIDENCE_ENABLED=false;window.VB_DIGEST_ENABLED=false;window.VB_DIGEST_SCHEDULED=false;
"""
BANNER = '<div style="padding:14px 20px;background:#fff0c5;color:#392d05;font:14px sans-serif;position:relative;z-index:9999">CONNECTED WATCH TEST · Public USPTO applications and fictional portfolio records · Production unchanged · <a href="/">Test entrances</a></div>'

class WatchTestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()

    def content(self, value, kind):
        data = value.encode() if isinstance(value,str) else value
        self.send_response(200);self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/auth/config.js':
            return self.content(CONFIG,'text/javascript; charset=utf-8')
        if path == '/':
            ids = json.loads(Path(self.server.fixture_ids).read_text())
            client = ids['client_a']
            html = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Connected Watch Test</title><link rel="stylesheet" href="/auth/auth.css"><body>'+BANNER+'<main><div class="card"><h1>Connected Trademark Watch Test</h1><p>Existing screens connected to the Test database. These are fictional portfolio records; potential matches are not legal conclusions.</p>'
            links = [('/attorney-login.html','Attorney Test sign-in'),('/attorney.html#watch-'+client,'Open fictional attorney review'),('/login.html','Client Test sign-in'),('/watch.html?client='+client,'Open fictional client findings'),('/trademark-watch.html?client='+client,'Open fictional client settings')]
            html += ''.join('<p><a href="'+url+'">'+label+'</a></p>' for url,label in links)+'</div></main></body></html>'
            return self.content(html,'text/html; charset=utf-8')
        resolved = Path(self.translate_path(self.path)).resolve()
        if not resolved.is_relative_to(ROOT):
            return self.send_error(404)
        parts = resolved.relative_to(ROOT).parts
        if any(p.startswith('.') for p in parts) or (parts and parts[0] in ('work','supabase','handoffs','tools')):
            return self.send_error(404)
        if resolved.is_dir():
            return self.send_error(404)
        if resolved.suffix == '.html' and resolved.is_file():
            html = resolved.read_text()
            html = re.sub(r'(<body\b[^>]*>)',lambda m:m.group(1)+BANNER,html,count=1)
            return self.content(html,'text/html; charset=utf-8')
        return super().do_GET()

if __name__ == '__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--fixture-ids',required=True);args=p.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',8886),WatchTestHandler)
    server.fixture_ids=args.fixture_ids
    server.serve_forever()
