# Realtime Market Dashboard

Angular application: a live market dashboard and a data-producer settings page.

- **Demo:** https://deniskoliban.github.io/realtime-market-dashboard/
- **Repository:** https://github.com/deniskoliban/realtime-market-dashboard

## Requirements

Node 24.

## Commands

| Command | Result |
| --- | --- |
| `npm ci` | install dependencies |
| `npm start` | dev server on http://localhost:4200 |
| `npm test` | unit tests — Vitest via `@angular/build:unit-test` (jsdom); watches in an interactive terminal |
| `npm run build` | production build in `dist/realtime-market-dashboard/browser` |

## Deployment

Every push to `main` tests, builds and publishes to GitHub Pages automatically; pull requests only
test and build. The workflow is `.github/workflows/ci-cd.yml`, and progress and history are on the
[workflow runs page](https://github.com/deniskoliban/realtime-market-dashboard/actions/workflows/ci-cd.yml).
The Pages source must be set to **GitHub Actions**.

Deep links such as `/dashboard` return HTTP 404 while still rendering the application — a Pages
limitation, not a broken page.
