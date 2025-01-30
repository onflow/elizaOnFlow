import { FlowAccountBalanceInfo } from "@elizaos/plugin-flow";

/**
 * Format the account information
 * @param userId user id
 * @param accountName account name
 * @param info flow account information
 * @returns the formatted string
 */
export function formatWalletInfo(
    userId: string,
    accountName: string,
    info: FlowAccountBalanceInfo = undefined,
): string {
    let output = formatAccountInfoPrefix(userId, accountName);
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
 * Format the wallet created message
 * @param userId user id
 * @param accountName account name
 * @param newAddress new address
 * @returns the formatted string
 */
export function formatWalletCreated(
    userId: string,
    accountName: string,
    newAddress: string,
): string {
    let output = formatAccountInfoPrefix(userId, accountName);
    output += `- New created address: ${newAddress}`;
    return output;
}

/**
 * Format the account information prefix
 */
function formatAccountInfoPrefix(userId: string, accountName: string): string {
    let output = `Here is your account information:\n`;
    output += `- UserId: ${userId}\n`;
    output += `- WalletId: ${accountName}\n`;
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
