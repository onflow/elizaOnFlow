---
sidebar_position: 1
---

# Introduction to Eliza 🤖 on Flow Blockchain

Flow-dedicated Autonomous Agents powered by [Eliza](https://github.com/elizaOs/eliza).

<div align="center">
  <img src="../static/img/elizaOnFlow_banner.png" alt="ElizaOnFlow Banner" width="100%" />
</div>

## ✨ Features

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

## ✨ Use Cases

Eliza can be used to create:

1. **AI Assistants**

    - Customer support agents
    - Community moderators
    - Personal assistants

2. **Social Media Personas**

    - Automated content creators
    - Engagement bots
    - Brand representatives

3. **Knowledge Workers**

    - Research assistants
    - Content analysts
    - Document processors

4. **Interactive Characters**
    - Role-playing characters
    - Educational tutors
    - Entertainment bots

## Getting Started

Check out [Quickstart Guide](./quickstart.md) to begin your journey with Eliza on Flow and build your first AI Agent.
