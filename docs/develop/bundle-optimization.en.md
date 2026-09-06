# Bundle optimization and monitoring

The template ships sensible defaults for bundle size; this is how to inspect what reaches the
browser and where to cut. Budgets for public pages are enforced in CI by Lighthouse
(`lighthouserc.json`, see [`../deploy/ci-notifications-lighthouse.ru.md`](../deploy/ci-notifications-lighthouse.ru.md)).

## Analyze locally

```bash
pnpm analyze:webpack    # next build --webpack with @next/bundle-analyzer (ANALYZE=true)
pnpm analyze:next       # next experimental-analyze
```

The webpack report lands in `.next/diagnostics/analyze/`; open `index.html` for a treemap of
client and server bundles.

What to look for:

- large third-party libraries (`framer-motion`, `cmdk`, `react-json-pretty`, `lucide-react`);
- components that pull many icons or demo UI into common chunks;
- pages that import heavy modules in layouts or shared providers.

## Techniques

- **Lazy-load heavy, rarely used components** with `next/dynamic`:

  ```ts
  import dynamic from 'next/dynamic'

  const HeavyComponent = dynamic(() => import('./HeavyComponent'), { ssr: false })
  ```

- **Keep heavy libs local to the pages that need them** (the `ui-kit` demo, the editor) instead of
  root layouts or global providers.
- `optimizePackageImports` is already on in `next.config.ts` for `framer-motion`, `cmdk`,
  `lucide-react` — add packages that export many symbols.
- Prefer native JS or a small utility over pulling in the whole of `lodash`.

## HTTP level (already wired)

- nginx enables gzip for JS/CSS/HTML/fonts.
- `/_next/static/` is served with `Cache-Control: public, max-age=2592000, immutable` — hashed file
  names make long browser caching safe.

## Metrics stack and small servers

The full stack (Prometheus, Grafana, Loki, Promtail, Telegraf, exporters) is heavy for a
single-core VPS: expect 80–100 % CPU and high disk I/O when exploring logs or wide time ranges.
Memory is derived from `server_memory_mb` in the deploy workflow (`scripts/lib/memory-limits.sh`);
Grafana 13 needs ~450 MB on a Loki query, so below ~4 GB keep `metrics_enabled: false` and use CLI
monitoring (`top`, `docker stats`, `journalctl`) — see
[`../deploy/github-actions.en.md`](../deploy/github-actions.en.md#manual-monitoring-on-the-server).
On 2+ vCPUs and 4+ GB you can lower `scrape_interval` in `grafana/prometheus/prometheus.yml` and
enable more inputs in `grafana/promtail-config.yml` / `grafana/telegraf/telegraf.conf`.
