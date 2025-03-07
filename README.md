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
- Provide accounts management for AI Agents based on Flow’s unique Account Linking feature.
  - Fully on-chain child accounts management without any extra off-chain private key custodial service.
  - Each user account in Eliza system can be allocated with a full functional Flow wallet fully controlled by the AI Agent as its child account.
  - You can customize any transaction for your users based on the on-chain child accounts management system.
- Both Flow EVM and Flow Cadence projects will be supported.
- Fully compatible with origin Eliza plugins.

## 📚 Documentation

- 🚀 Quick Start: Please follow the [Quick Start Guide](./docs/guides/quickstart.md) to create your first Agent on Flow.
- 📖 Plugin: Please follow the [Plugin Development Guide](./docs//guides//build-plugin.md) to create your Plugin for Eliza On Flow.

## 🌊 Flow Cadence

### Core Cadence Contracts

- [AccountsPool](./cadence/contracts/AccountsPool.cdc) - A contract to let the agent account manage multiple child accounts.

| Contract | Testnet Address | Mainnet Address |
| --- | --- | --- |
| AccountsPool | [0x9f9cd022231f7a19](https://testnet.flowscan.io/contract/A.9f9cd022231f7a19.AccountsPool) | [0xa253e78e8971f273](https://www.flowscan.io/contract/A.a253e78e8971f273.AccountsPool) |

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
