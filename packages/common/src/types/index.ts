export type TokenInfo = {
    symbol: string;
    name: string;
    decimals: number;
    totalSupply: number;
    description?: string;
    addressEVM?: string;
    identifierCadence?: string;
    logoURI?: string;
    priceInFLOW?: number;
    mcapValueInFLOW?: number;
};

export type TokenDetailsFromTokenList = Partial<{
    chainId: number;
    address: string;
    contractName: string;
    path: {
        vault: string;
        receiver: string;
        balance: string;
    };
    evmAddress: string;
    flowAddress: string;
    symbol: string;
    name: string;
    description: string;
    decimals: 8;
    logoURI: string;
    tags: [];
    extensions: Record<string, string>;
}>;
