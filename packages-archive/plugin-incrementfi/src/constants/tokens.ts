export const TESTNET_TOKENS = {
    FLOW: {
        name: "FlowToken",
        address: "0x7e60df042a9c0868",
        identifier: "A.7e60df042a9c0868.FlowToken",
        storagePath: "/storage/flowTokenVault",
        publicPath: "/public/flowTokenReceiver",
    },
    USDC: {
        name: "USDCFlow",
        address: "0x64adf39cbc354fcb",
        identifier: "A.64adf39cbc354fcb.USDCFlow",
        storagePath: "/storage/USDCVault",
        publicPath: "/public/USDCVaultReceiver",
    }
};

export const DEFAULT_DEADLINE = 3600; // 1 hour
export const DEFAULT_SLIPPAGE = 0.005; // 0.5%

export const STORAGE_PATHS = {
    FLOW_TOKEN: "/storage/flowTokenVault",
    USDC: "/storage/USDCVault"
};

export const PUBLIC_PATHS = {
    FLOW_TOKEN: "/public/flowTokenReceiver",
    USDC: "/public/USDCVaultReceiver"
};