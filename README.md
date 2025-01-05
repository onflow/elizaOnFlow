# Eliza 🤖 on Flow Blockchain

Flow-dedicated Autonomous Agents powered by [Eliza](https://github.com/elizaOs/eliza).

<div align="center">
  <img src="./docs/static/img/elizaOnFlow_banner.png" alt="ElizaOnFlow Banner" width="100%" />
</div>

## ✨ Features & Use Cases

> Basic Features

Check out the [Eliza's README](https://github.com/elizaOS/eliza/tree/main?tab=readme-ov-file#-features)

> Extra Features

- Provide Flow-dedicated Agent without other extra blockchain dependencies in runtime.
- Use shared `flow.json` for all Flow Cadence contracts dependencies in plugins.
- Use [InversifyJS](https://github.com/inversify/InversifyJS) for dependency injection.
  - Share the same instances of providers across the application and plugins.
  - All actions / evaluators / providers for plugins can be dynamically loaded and injected.
  - Provide standard action / evaluator wrapper for plugins.
  - Let develoeprs focus on the business logic of actions / evaluators.
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

# Checkout the latest release
# This project iterates fast, so we recommend checking out the latest release
git checkout $(git describe --tags --abbrev=0)
```

### Automatically Start ElizaOnFlow

This will run everything to setup the project and start the bot with the default character.

```bash
sh scripts/start.sh
```

### Edit the character file

1. To load custom characters:
    - Use `pnpm start --characters="path/to/your/character.json"`
    - Multiple character files can be loaded simultaneously
2. Connect with X (Twitter)
    - change `"clients": []` to `"clients": ["twitter"]` in the character file to connect with X

### Manually Start ElizaOnFlow

```bash
pnpm i
pnpm build
pnpm start

# The project iterates fast, sometimes you need to clean the project if you are coming back to the project
pnpm clean
```

#### Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```bash
pnpm install --include=optional sharp
```

#### Install / Add new Flow Cadence contracts dependencies

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
