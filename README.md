# Venture Branding

The current website, blog, Legal Launch Kit, and portals live on `codex/portal-consolidation`. Start from this branch for current Venture Branding work.

## Local preview

Reuse the existing Venture Branding checkout on `codex/portal-consolidation` and try the homepage link below before starting another server. A new Codex chat should run on this computer with that checkout as its project folder.

If port 8895 is free and the preview is stopped, start it from the repository root.

```sh
python3 -B tools/portal-consolidation-server.py --environment bcm-production --port 8895
```

- [Homepage](http://127.0.0.1:8895/)
- [Blog](http://127.0.0.1:8895/blog.html)

The preview listens on this computer only. If a local chat needs permission to start or reach the server, request the access needed for this preview. Opening public pages locally does not publish the site or start Trademark Watch.
