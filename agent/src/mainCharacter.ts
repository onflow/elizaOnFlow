import { request, gql } from 'graphql-request'

// Uniswap V3 Subgraph API endpoint
const UNISWAP_V3_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'

// GraphQL query to fetch pool data from Uniswap V3 subgraph
const POOL_QUERY = gql`
  query getPoolData($poolId: ID!) {
    pool(id: $poolId) {
      token0Price
      token1Price
      volumeUSD
      token0 { symbol }
      token1 { symbol }
    }
  }
`

// Main bot class for monitoring crypto prices and market movements
class CryptoBot {
  private poolId = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8' // ETH-USDC pool
  private lastPrice = 0
  private lastCheck = 0

/**
   * Check if a price claim in a tweet is accurate
   * @param tweet - The tweet text containing a price claim
   * @returns An object with the claimed price, actual price, difference percentage, and accuracy status
*/
  async checkPriceClaim(tweet: string) {
    // Extract price from the tweet using regex (e.g., "$3000")
    const priceMatch = tweet.match(/\$(\d+(\.\d+)?)/);
    if (!priceMatch) return null;

    const claimedPrice = Number.parseFloat(priceMatch[1]);  // Convert extracted price to a number

    try {
      // Fetch the latest ETH price from Uniswap V3 subgraph
      const data = await request(UNISWAP_V3_SUBGRAPH, POOL_QUERY, { poolId: this.poolId }) as { pool: { token0Price: string, token1Price: string, volumeUSD: string, token0: { symbol: string }, token1: { symbol: string } } };
      const currentPrice = Number.parseFloat(data.pool.token0Price);  // Convert token0Price to a number

      // Calculate percentage difference between claimed and actual price
      const difference = Math.abs((currentPrice - claimedPrice) / currentPrice * 100);

      return {
        claimed: claimedPrice,
        actual: currentPrice,
        difference: difference,
        isAccurate: difference <= 5 // Considered accurate if within ±5% of actual price
      };
    } catch (error) {
      console.error('Error checking price:', error);
      return null;
    }
  }

/**
   * Monitor the crypto market and detect significant price or volume changes
   * @returns An alert message if a significant change is detected
   */
  async checkMarket() {
    const now = Date.now();
    // Ensure a minimum interval of 2 minutes between checks
    if (now - this.lastCheck < 120000) return null;

    try {
        // Fetch the latest ETH price and 24h volume from Uniswap V3 subgraph
      const data = await request(UNISWAP_V3_SUBGRAPH, POOL_QUERY, { poolId: this.poolId }) as { pool: { token0Price: string, token1Price: string, volumeUSD: string, token0: { symbol: string }, token1: { symbol: string } } };
      const currentPrice = Number.parseFloat(data.pool.token0Price);
      const volume = Number.parseFloat(data.pool.volumeUSD);

      let alert = null;

      // Price change alert: Trigger if price moves by more than 5%
      if (this.lastPrice && Math.abs((currentPrice - this.lastPrice) / this.lastPrice) > 0.05) {
        alert = `🚨 Price Alert: ETH/USDC moved from $${this.lastPrice.toFixed(2)} to $${currentPrice.toFixed(2)}`;
      }
      // Volume alert: Trigger if 24-hour volume exceeds $1 million
      else if (volume > 1000000) {
        alert = `📊 Volume Alert: ETH/USDC 24h volume: $${Math.floor(volume).toLocaleString()}`;
      }

      // Update last recorded price and check time
      this.lastPrice = currentPrice;
      this.lastCheck = now;
      return alert;
    } catch (error) {
      console.error('Error monitoring market:', error);
      return null;
    }
  }
}

// Export the bot instance for external use
export const cryptoBot = new CryptoBot();

// Main configuration for the Twitter bot
export const mainCharacter = {
  clients: ['TWITTER'],
  name: "raman0x19",

  /**
   * Handles incoming tweets and checks for price claims
   * @param tweet - The tweet text
   * @returns A response message if a price claim is detected
   */
  async onTweet(tweet: string) {
    const check = await cryptoBot.checkPriceClaim(tweet);
    if (check) {
      return `Fact Check:
Price claimed: $${check.claimed}
Actual price: $${check.actual}
${check.isAccurate ? '✅ Accurate' : '❌ Inaccurate'} (${check.difference.toFixed(1)}% difference)`;
    }
  },

/**
   * Runs periodic market monitoring
   * @returns An alert message if a significant price or volume change is detected
*/
  async onInterval() {
    const alert = await cryptoBot.checkMarket();
    if (alert) {
      return alert;
    }
  }
};