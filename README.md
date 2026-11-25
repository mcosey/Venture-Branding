# Venture Branding

The current website, blog, Legal Launch Kit, and portals live on `codex/portal-consolidation`. The `tg` branch preserves the original designs and earlier release history.

## Local preview

Reuse an existing Venture Branding checkout on `codex/portal-consolidation` when available. From its repository root, start the current site preview if it is stopped:

```sh
python3 -B tools/portal-consolidation-server.py --environment bcm-production --port 8895
```

- [Homepage](http://127.0.0.1:8895/v8.html)
- [Blog](http://127.0.0.1:8895/blog.html)

The preview listens on this computer only. Opening public pages locally does not publish the site or start Trademark Watch.
