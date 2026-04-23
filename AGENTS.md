# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, and others) working in
this repository. Loaded automatically into agent context — keep it concise.

## Overview

`eliza-onflow` is a Flow-dedicated wrapper around the upstream [ElizaOS](https://github.com/elizaOs/eliza)
agent framework. It adds Flow Cadence and Flow EVM support, an InversifyJS-based dependency
injection layer for plugins, and on-chain child-account management via the `AccountsPool`
Cadence contract (deployed at `0xa253e78e8971f273` on mainnet and `0x9f9cd022231f7a19` on
testnet per `flow.json`). The repo is a pnpm + Turborepo + Lerna monorepo; upstream Eliza is
consumed as a git submodule at `deps/eliza`.

## Build and Test Commands

Root `package.json` defines 15 scripts. Grouped:

Setup (first time or after adding a dep):
- `git clone --recurse-submodules ...` or `git submodule update --init --recursive` — required; upstream Eliza and plugin-* submodules back the workspace.
- `pnpm install --no-frozen-lockfile` — only when bootstrapping or bumping deps (see `docs/guides/quickstart.md`); regular installs should use the frozen lockfile.
- `flow deps install` — installs Cadence contract dependencies declared in `flow.json`.
- `cp .env.example .env` — `.env.example` is a symlink to `deps/eliza/.env.example`; add Flow vars from `.env.flow.example`.

Build / lint / format:
- `pnpm build` — `turbo run build` with `turbo.excludes` filters applied.
- `pnpm check` — Biome check with `--write` (format + lint autofix).
- `pnpm lint` — `biome lint .`
- `pnpm format` — `biome format --write .`
- `pnpm preinstall` — runs `npx only-allow pnpm`; invoked automatically by pnpm.

Run the agent:
- `pnpm start` — runs the `@fixes-ai/agent` workspace.
- `pnpm start --character="characters/sample.character.json"` — load a specific character (comma-separated list via `--characters=`).
- `pnpm start:debug` — same with `NODE_ENV=development VERBOSE=true DEFAULT_LOG_LEVEL=debug DEBUG=eliza:*`.
- `pnpm cleanstart` / `pnpm cleanstart:debug` — deletes `agent/data/db.sqlite` before start.
- `pnpm start:client` — runs the client UI from `client/` (served at `http://localhost:5173/` per quickstart).

Test / release (delegated to upstream Eliza scripts in `deps/eliza/scripts/`):
- `pnpm test` — `bash ./deps/eliza/scripts/test.sh`
- `pnpm smokeTests` — `bash ./deps/eliza/scripts/smokeTests.sh`
- `pnpm integrationTests` — `bash ./deps/eliza/scripts/integrationTests.sh`
- `pnpm clean` — `bash ./deps/eliza/scripts/clean.sh`
- `pnpm release` — `pnpm build && pnpm prettier && npx lerna publish --no-private --force-publish` (main branch only per `lerna.json`). **Broken as written — see Gotchas.**

## Architecture

Monorepo layout (pnpm workspaces declared in `pnpm-workspace.yaml`: `deps/eliza/packages/*`,
`packages/*`, `client`, `agent`):

- `agent/` — `@fixes-ai/agent`, the entrypoint runtime. Source in `agent/src/` (`index.ts`, `index.utils.ts`, `character.ts`, `defaultCharacter.ts`).
- `packages/` — git submodules for first-party Flow plugins (per `.gitmodules`):
  - `plugin-di` — InversifyJS DI framework for Eliza plugins.
  - `plugin-flow` — core Flow integration (depends on `plugin-di`, per `turbo.json`).
  - `plugin-flow-advanced` — adds `AccountsPool` child-account flows (depends on `plugin-di` + `plugin-flow`).
  - `plugin-flow-template` — template for new plugins (`onflow/eliza-plugin-template`).
- `packages-community/` — in-tree community plugins: `plugin-bridge`, `plugin-incrementfi`, `plugin-nba-topshot`. NOT part of `pnpm-workspace.yaml`; each has its own build.
- `cadence/contracts/AccountsPool.cdc` — the only first-party Cadence contract. Aliases in `flow.json`.
- `cadence/transacations/keys/` — `add-more-keys.cdc`, `revoke-key.cdc`. Note the typo (`transacations`) — it is the on-disk name.
- `deps/eliza/` — upstream `elizaOS/eliza` submodule. Several root dotfiles (`biome.json`, `.nvmrc`, `.npmrc`, `codecov.yml`, `commitlint.config.js`, `.env.example`, `.gitpod.yml`) are symlinks into this submodule.
- `characters/` — character JSON configs (e.g., `scooby.character.json`).
- `docs/guides/` — `quickstart.md`, `build-plugin.md`, `index.md`.
- `scripts/` — symlinks to `deps/eliza/scripts/` (`dev.default.sh` → `dev.sh`, `start.sh`).

Build order is enforced by `turbo.json`: every `build` depends on `@elizaos/core#build`;
`plugin-flow` depends on `plugin-di`; `plugin-flow-advanced` depends on both.

## Conventions and Gotchas

- **pnpm is mandatory.** Root `preinstall` runs `npx only-allow pnpm`; yarn/npm installs fail.
- **Node 23.3.0** pinned in `engines` (`package.json`); quickstart requires Node 23+.
- **Submodules are load-bearing.** `deps/eliza`, `packages/plugin-flow`, `packages/plugin-di`, `packages/plugin-flow-advanced`, `packages/plugin-flow-template` are all submodules (`.gitmodules`). Missing submodules break builds and break symlinked dotfiles like `biome.json`.
- **Biome is the only active linter/formatter in this repo.** `biome.json` (symlink to `deps/eliza/biome.json`) is the config, `@biomejs/biome` is in `devDependencies`, and `.vscode/settings.json` explicitly sets `prettier.enable: false` and `eslint.enable: false`. Commit `3dbea2f` migrated from ESLint to Biome. Use `pnpm check` to autofix.
- **The `release` script references prettier that is not installed.** `package.json:15` runs `pnpm prettier` but there is no `prettier` root script, no `prettier` dependency in `package.json`, and zero occurrences of `prettier` in `pnpm-lock.yaml`. As written, `pnpm release` will fail at the prettier step. It is a leftover from pre-Biome migration; do not "fix it" by reintroducing Prettier — either remove `pnpm prettier &&` from the script or replace it with `pnpm check`.
- **DI plugins need a `postProcessor`.** When a character uses a plugin built on `@elizaos-plugins/plugin-di`, `postProcessors: ["@elizaos-plugins/plugin-di"]` must be set in the character JSON (`docs/guides/build-plugin.md:91`). `clients` is deprecated; add clients via `plugins`.
- **Cadence deps flow through `flow.json`.** Add new deps with `flow deps add mainnet://0xAddress.ContractName` (README). Do not hand-edit `flow.json` dependency hashes.
- **Conventional commits enforced on PR titles.** `.github/workflows/pr.yaml` requires `^(feat|fix|docs|style|refactor|test|chore)(\(scope\))?: description`.
- **Character-driven config.** Default character lives at `agent/src/character.ts` / `defaultCharacter.ts` — pass `--character=` / `--characters=` to override. `modelProvider` is set per-character, not globally.
- **`pnpm cleanstart` wipes `agent/data/db.sqlite`** — do not run if local agent state matters.

## Files Not to Modify

- `deps/eliza/**` — upstream submodule; change upstream, not here.
- `packages/plugin-di`, `packages/plugin-flow`, `packages/plugin-flow-advanced`, `packages/plugin-flow-template` — submodules; PR in their source repos.
- Symlinked root dotfiles (`biome.json`, `.env.example`, `.nvmrc`, `.npmrc`, `commitlint.config.js`, `codecov.yml`, `.gitpod.yml`) — edit the target in `deps/eliza/`.
- `pnpm-lock.yaml` — only changed via pnpm itself.
- `emulator.key` — Flow emulator key file; do not alter or commit replacements.
