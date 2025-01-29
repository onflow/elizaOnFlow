import { FlowAccountBalanceInfo } from "@elizaos/plugin-flow";

/**
 * Format the account information
 *
 * @param info flow account information
 * @returns the formatted price string
 */
export function formatWalletInfo(
    userId: string,
    accountName: string,
    info: FlowAccountBalanceInfo = undefined,
): string {
    let output = `Here is your account information:\n`;
    output += `- UserId: ${userId}\n`;
    output += `- WalletId: ${accountName}\n`;
    if (info === undefined) {
        output += `- No wallet information found, maybe you don't have a wallet yet.`;
    } else {
        output += `- Flow wallet address: ${info.address}\n`;
        output += `- FLOW balance: ${info.balance} FLOW\n`;
        output += `- Flow wallet's COA(EVM) address: ${info.coaAddress || "unknown"}\n`;
        output += `- FLOW balance in COA(EVM) address: ${info.coaBalance ?? 0} FLOW`;
    }
    return output;
}

/**
 * Format the transaction sent message
 * @param txid
 * @param extra
 */
export function formatTransationSent(
    txId: string,
    network: string,
    extra?: string,
): string {
    const baseUrl =
        network === "testnet"
            ? "https://testnet.flowscan.io"
            : "https://flowscan.io";
    const txURL = `${baseUrl}/tx/${txId}/events`;
    return `Transaction Sent: [${txId}](${txURL})\n${extra ?? ""}`;
}
