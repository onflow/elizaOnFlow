# Eliza 🤖 on Flow Blockchain

Flow-dedicated Autonomous Agents powered by [Eliza](https://github.com/elizaOs/eliza).

<div align="center">
  <img src="./docs/static/img/elizaOnFlow_banner.png" alt="ElizaOnFlow Banner" width="100%" />
</div>

## ✨ Features & Use Cases

> Basic Features

Check out the [Eliza's README](https://github.com/elizaOS/eliza/tree/main?tab=readme-ov-file#-features)

> Extra Features

- Provide Flow-dedicated Agent without other extra blockchain dependencies runtime(by default).
  - You can still use other blockchains if you want.
- Use [InversifyJS](https://github.com/inversify/InversifyJS) for dependency injection.
  - Share the same instances of providers across the application and plugins.
  - All actions / evaluators / providers for plugins can be dynamically loaded and injected.
  - Provide standard action / evaluator wrapper for plugins.
  - Let develoeprs focus on the business logic of actions / evaluators.
- Use shared `flow.json` for all Flow Cadence contracts dependencies in Flow relevant plugins.
- Both Flow EVM and Flow Cadence projects will be supported.

## 🚀 Quick Start

### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)
- [Flow-cli](https://developers.flow.com/tools/flow-cli)

> **Note for Windows Users:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) is required.

### Install ElizaOnFlow

```bash
# Clone the repository
git clone --recurse-submodules https://github.com/fixes-world/elizaOnFlow.git

# If you already cloned without submodules, run:
git submodule update --init --recursive
```
<!--
This project iterates fast, so we recommend checking out the latest release.

```bash
# Checkout the latest release
git checkout $(git describe --tags --abbrev=0)
``` -->

#### Edit the .env file

Copy .env.example to .env and fill in the appropriate values.

```bash
cp .env.example .env
```

Note: .env is optional. If you're planning to run multiple distinct agents, you can pass secrets through the character JSON

#### Start Eliza

```bash
pnpm i
pnpm build
pnpm start

# The project iterates fast, sometimes you need to clean the project if you are coming back to the project
pnpm clean
```

### Interact via Browser

Once the agent is running, you should see the message to run "pnpm start:client" at the end.

Open another terminal, move to the same directory, run the command below, then follow the URL to chat with your agent.

```bash
pnpm start:client
```

### Edit the character file

1. Open `agent/src/character.ts` to apply modifications on the default character.
2. To load custom characters:
    - Use `pnpm start --characters="path/to/your/character.json"`
    - Multiple character files can be loaded simultaneously
3. Connect with X (Twitter)
    - change `"clients": []` to `"clients": ["twitter"]` in the character file to connect with X

#### Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```bash
pnpm install --include=optional sharp
```

## 🌊 Flow Cadence

### Core Cadence Contracts

- [AccountsPool](./cadence/contracts/AccountsPool.cdc) - A contract to let the agent account manage multiple child accounts.

| Contract | Testnet Address | Mainnet Address |
| --- | --- | --- |
| AccountsPool | [0x9f9cd022231f7a19](https://testnet.flowscan.io/account/0x9f9cd022231f7a19) | Not deployed yet |

### Install / Add new Flow Cadence contracts dependencies

All Flow Cadence contracts dependencies should be installed to `flow.json` file.
To ensure development and deployment, you need to install all dependencies.

```bash
flow deps install
```

And if you want to add a new contract dependency, you can use the following command:

```bash
flow deps add mainnet://0xAddress.ContractName
```

### Community & contact

- [GitHub Issues](https://github.com/fixes-world/elizaOnFlow/issues). Best for: bugs you encounter using ElizaOnFlow, and feature proposals.
- [Fixes Telegram](https://t.me/fixes_world). Best for: sharing your applications and hanging out with the Fixes community.
- [Eliza Discord](https://discord.gg/ai16z)
- [Flow Discord](https://discord.gg/flow)
