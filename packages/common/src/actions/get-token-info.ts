import { z } from "zod";
import { inject, injectable } from "inversify";
import {
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { type ActionOptions, globalContainer, property } from "@elizaos/plugin-di";
import { BaseFlowInjectableAction, CacheProvider, type ScriptQueryResponse } from "@fixes-ai/core";
import { scripts } from "../assets/scripts.defs";
import type { TokenDetailsFromTokenList, TokenInfo } from "../types";

/**
 * The generated content for the transfer action
 */
export class GetTokenInfoContent {
    @property({
        description:
            "This field should be the token symbol which usually starts with $ or uppercase letters.",
        examples: [
            "if a token is named LOPPY or $LOPPY, the field should be LOPPY",
            "if no token symbol is provided, the field should be null",
        ],
        schema: z.string().nullable(),
    })
    symbol: string;

    @property({
        description:
            "Cadence Resource Identifier or ERC20 contract address (if not native token). this field should be null if the token is native token which symbol is FLOW.",
        examples: [
            "For Cadence resource identifier, the field should be 'A.1654653399040a61.ContractName'",
            "For ERC20 contract address, the field should be '0xe6ffc15a5bde7dd33c127670ba2b9fcb82db971a'",
        ],
        schema: z.string().nullable(),
    })
    token: string | null;

    @property({
        description:
            "The blockchain VM type. This field should be either 'flow' or 'evm' according to the token type.",
        examples: [
            "If token field is Cadence resource identifier or null value, the vm field should be 'flow'",
            "If token field is ERC20 contract address, the vm field should be 'evm'",
            "If only symbol field is provided, the vm field should be 'flow'",
            "if symbol field is FLOW or token field is null, the vm field should be 'flow'",
        ],
        schema: z.string().refine((vm) => ["flow", "evm"].includes(vm)),
    })
    vm: "flow" | "evm";
}

/**
 * The transfer action options
 */
const actionOpts: ActionOptions<GetTokenInfoContent> = {
    name: "GET_TOKEN_INFO",
    similes: ["GET_TOKEN_DETAILS", "GET_TOKEN_METADATA"],
    description:
        "Call this action to obtain the current information of any fungible token on the Flow blockchain.",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get details for the $LOPPY token",
                    action: "GET_TOKEN_INFO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get information of $LOPPY token: A.53f389d96fb4ce5e.SloppyStakes",
                    action: "GET_TOKEN_INFO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me current marketcap of token: 0x995258Cea49C25595CD94407FaD9E99B81406A84",
                    action: "GET_TOKEN_INFO",
                },
            },
        ],
    ],
    contentClass: GetTokenInfoContent,
    suppressInitialMessage: true,
};

/**
 * Get price action
 *
 * @category Actions
 * @description Get the current price of FLOW token or stFLOW token
 */
@injectable()
export class GetTokenInfoAction extends BaseFlowInjectableAction<GetTokenInfoContent> {
    constructor(
        @inject(CacheProvider)
        private readonly cache: CacheProvider,
    ) {
        super(actionOpts);
    }

    /**
     * Validate if the action can be executed
     */
    async validate(_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> {
        const keywords: string[] = [
            "details",
            "token",
            "info",
            "information",
            "mcap",
            "marketcap",
            "详情",
            "市值",
        ];
        // Check if the message contains the keywords
        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase()),
        );
    }

    /**
     * Execute the transfer action
     *
     * @param content the content from processMessages
     * @param callback the callback function to pass the result to Eliza runtime
     * @returns the transaction response
     */
    async execute(
        content: GetTokenInfoContent | null,
        _runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
        callback?: HandlerCallback,
    ): Promise<ScriptQueryResponse | null> {
        if (!content) {
            elizaLogger.warn("No content generated");
            return;
        }

        elizaLogger.log("Starting GET_TOKEN_INFO handler...");

        // Get token list from cache
        const tokenListStr = await this.cache.getCachedData<string>("flow-token-list");
        let tokenList: TokenDetailsFromTokenList[] = [];
        if (!tokenListStr) {
            tokenList = await fetchTokenList();
            await this.cache.setCachedData(
                "flow-token-list",
                JSON.stringify(tokenList),
                60 * 60 * 24, // 24 hours
            );
        } else {
            tokenList = JSON.parse(tokenListStr);
        }

        // Use shared wallet instance
        const resp: ScriptQueryResponse = {
            ok: false,
        };

        let tokenInfo: TokenInfo;

        // if token symbol is FLOW or stFLOW, you cannot get token info
        const targetToken = content.symbol?.toLowerCase();
        if (["flow"].includes(targetToken)) {
            resp.error = "Cannot get token info for native FLOW token.";
        } else {
            const tokenDetails = tokenList.find((t) =>
                content.token
                    ? t.evmAddress === content.token ||
                      `A.${t.flowAddress}.${t.contractName}` === content.token
                    : t.symbol === content.symbol,
            );

            // initialize token info
            if (tokenDetails) {
                tokenInfo = {
                    symbol: tokenDetails.symbol,
                    name: tokenDetails.name,
                    description: tokenDetails.description,
                    decimals: tokenDetails.decimals,
                    addressEVM: tokenDetails.evmAddress,
                    identifierCadence: `A.${tokenDetails.flowAddress.slice(2)}.${tokenDetails.contractName}`,
                    logoURI: tokenDetails.logoURI,
                    totalSupply: 0,
                    priceInFLOW: 0,
                    mcapValueInFLOW: 0,
                };
            } else {
                tokenInfo = {
                    symbol: content.symbol,
                    name: "Unknown",
                    description: "",
                    decimals: 0,
                    addressEVM: undefined,
                    identifierCadence: undefined,
                    logoURI: undefined,
                    totalSupply: 0,
                    priceInFLOW: 0,
                    mcapValueInFLOW: 0,
                };
            }

            if (content.vm === "flow") {
                tokenInfo.decimals = 8;
                // if content.vm is flow, tokenDetails should be found
                if (!tokenDetails) {
                    resp.error = `Token info not found for $${content.symbol}`;
                } else {
                    try {
                        const info = await this.walletSerivce.executeScript(
                            scripts.getTokenInfoCadence,
                            (arg, t) => [
                                arg(tokenDetails.flowAddress, t.Address),
                                arg(tokenDetails.contractName, t.String),
                            ],
                            undefined,
                        );
                        elizaLogger.debug("Loaded token info:", info);
                        if (
                            info &&
                            info.address === tokenDetails.flowAddress &&
                            info.contractName === tokenDetails.contractName
                        ) {
                            tokenInfo.totalSupply = Number.parseFloat(info.totalSupply);
                            tokenInfo.priceInFLOW = Number.parseFloat(info.priceInFLOW);
                            tokenInfo.mcapValueInFLOW =
                                tokenInfo.totalSupply * tokenInfo.priceInFLOW;

                            resp.ok = true;
                            resp.data = tokenInfo;
                        } else {
                            resp.error = `Failed to get token info for $${content.symbol}`;
                        }
                    } catch (err) {
                        resp.error = `Failed to get token info for $${content.symbol}: ${err.message}`;
                    }
                }
            } else if (/^0x[0-9a-fA-F]{40}$/.test(content.token ?? "")) {
                // if content.vm is evm, query token info from the blockchain using evm DEX
                try {
                    const info = await this.walletSerivce.executeScript(
                        scripts.getTokenInfoEVM,
                        (arg, t) => [arg(content.token, t.String)],
                        undefined,
                    );
                    if (info && info.address?.toLowerCase() === content.token.toLowerCase()) {
                        tokenInfo.name = info.name;
                        tokenInfo.symbol = info.symbol;
                        tokenInfo.decimals = Number.parseInt(info.decimals);
                        tokenInfo.totalSupply =
                            Number.parseInt(info.totalSupply) / 10 ** tokenInfo.decimals;
                        const reservedTokenInPair = Number.parseInt(info.reservedTokenInPair);
                        const reservedFlowInPair = Number.parseInt(info.reservedFlowInPair);
                        tokenInfo.priceInFLOW = reservedFlowInPair / reservedTokenInPair;
                        tokenInfo.mcapValueInFLOW = tokenInfo.totalSupply * tokenInfo.priceInFLOW;

                        resp.ok = true;
                        resp.data = tokenInfo;
                    }
                } catch (err) {
                    resp.error = `Failed to get token info for $${content.symbol}: ${err.message}`;
                }
            } else {
                resp.error = `Invalid token address or identifier: ${content.token}`;
            }
        }

        if (resp.ok && resp.data) {
            callback?.({
                text: format(resp.data as TokenInfo),
                content: {
                    success: true,
                    tokenInfo,
                },
                source: "FlowBlockchain",
            });
        } else {
            const errMsg = resp.error ?? resp.errorMessage ?? "Unknown error";
            elizaLogger.error("Error:", errMsg);
            callback?.({
                text: `Failed to get token info of $${content.symbol ?? "UKN"} - ${content.token}(${content.vm}): ${resp.error}`,
                content: { error: errMsg },
                source: "FlowBlockchain",
            });
        }

        elizaLogger.log("Completed GET_TOKEN_INFO handler.");

        return resp;
    }
}

const TOKEN_LIST_REQUEST_URL =
    "https://raw.githubusercontent.com/fixes-world/token-list-jsons/refs/heads/main/jsons/mainnet/flow/reviewers/0xa2de93114bae3e73.json";

const fetchTokenList = async () => {
    const response = await fetch(TOKEN_LIST_REQUEST_URL);
    try {
        const rawdata = await response.json();
        return rawdata?.tokens ?? [];
    } catch (error) {
        elizaLogger.error("Error fetching token list:", error.message);
    }
    return [];
};

const format = (token: TokenInfo): string => `### Token Details

${token.logoURI?.startsWith("http") ? `![${token.name}](${token.logoURI})` : ""}
Symbol: $${token.symbol}
Name: ${token.name}
Decimals: ${token.decimals}
Total Supply: ${token.totalSupply}

EVM contract address: ${token.addressEVM ?? "unknown"}
Cadence identifier: ${token.identifierCadence ?? "unknown"}

Price in FLOW: ${token.priceInFLOW ?? "unknown"}
Market Cap in FLOW: ${token.mcapValueInFLOW ?? "unknown"}
`;

// Register the transfer action
globalContainer.bind(GetTokenInfoAction).toSelf();
