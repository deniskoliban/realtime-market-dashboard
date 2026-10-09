# Realtime Market Dashboard

Angular application: a live market dashboard and a data-producer settings page.

- **Demo:** https://deniskoliban.github.io/realtime-market-dashboard/
- **Repository:** https://github.com/deniskoliban/realtime-market-dashboard

## Requirements

- Node 24
- Rust with the `wasm32-unknown-unknown` target, and `wasm-pack`

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

The toolchain version is pinned in `wasm/rust-toolchain.toml`, so `rustup` installs the right one on
first use.

## Commands

| Command | Result |
| --- | --- |
| `npm ci` | install dependencies |
| `npm run build:wasm` | compile `wasm/src` into `wasm/pkg` |
| `npm start` | dev server on http://localhost:4200 |
| `npm test` | unit tests — Vitest via `@angular/build:unit-test` (jsdom); watches in an interactive terminal |
| `npm run build` | production build in `dist/realtime-market-dashboard/browser` |
| `cargo test --manifest-path wasm/Cargo.toml` | generator tests, run as plain Rust without WebAssembly |

`wasm/pkg` is generated and not committed. `npm start`, `npm test` and `npm run build` rebuild it
first, so a fresh checkout needs no extra step; `angular.json` copies `market_generator_bg.wasm` from
it into the build output.

## Deployment

Every push to `main` tests, builds and publishes to GitHub Pages automatically; pull requests only
test and build. The workflow is `.github/workflows/ci-cd.yml`, and progress and history are on the
[workflow runs page](https://github.com/deniskoliban/realtime-market-dashboard/actions/workflows/ci-cd.yml).
The Pages source must be set to **GitHub Actions**.

Deep links such as `/dashboard` return HTTP 404 while still rendering the application — a Pages
limitation, not a broken page.
