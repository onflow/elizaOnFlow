import { request, gql } from 'graphql-request'

const UNISWAP_V3_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'

// Queries
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

// Main bot class
class CryptoBot {
  private poolId = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8' // ETH-USDC pool
  private lastPrice = 0
  private lastCheck = 0

  // Check price claims in tweets
  async checkPriceClaim(tweet: string) {
    // Extract price from tweet (simple regex)
    const priceMatch = tweet.match(/\$(\d+(\.\d+)?)/);
    if (!priceMatch) return null;

    const claimedPrice = Number.parseFloat(priceMatch[1]);

    try {
      const data = await request(UNISWAP_V3_SUBGRAPH, POOL_QUERY, { poolId: this.poolId }) as { pool: { token0Price: string, token1Price: string, volumeUSD: string, token0: { symbol: string }, token1: { symbol: string } } };
      const currentPrice = Number.parseFloat(data.pool.token0Price);

      const difference = Math.abs((currentPrice - claimedPrice) / currentPrice * 100);

      return {
        claimed: claimedPrice,
        actual: currentPrice,
        difference: difference,
        isAccurate: difference <= 5 // Within 5%
      };
    } catch (error) {
      console.error('Error checking price:', error);
      return null;
    }
  }

  // Monitor market movements
  async checkMarket() {
    const now = Date.now();
    // Only check every 2 minutes
    if (now - this.lastCheck < 120000) return null;

    try {
      const data = await request(UNISWAP_V3_SUBGRAPH, POOL_QUERY, { poolId: this.poolId }) as { pool: { token0Price: string, token1Price: string, volumeUSD: string, token0: { symbol: string }, token1: { symbol: string } } };
      const currentPrice = Number.parseFloat(data.pool.token0Price);
      const volume = Number.parseFloat(data.pool.volumeUSD);

      let alert = null;

      // Price change alert (if price changed by >5%)
      if (this.lastPrice && Math.abs((currentPrice - this.lastPrice) / this.lastPrice) > 0.05) {
        alert = `🚨 Price Alert: ETH/USDC moved from $${this.lastPrice.toFixed(2)} to $${currentPrice.toFixed(2)}`;
      }
      // Volume alert (if volume > $1M)
      else if (volume > 1000000) {
        alert = `📊 Volume Alert: ETH/USDC 24h volume: $${Math.floor(volume).toLocaleString()}`;
      }

      this.lastPrice = currentPrice;
      this.lastCheck = now;
      return alert;
    } catch (error) {
      console.error('Error monitoring market:', error);
      return null;
    }
  }
}

// Export the bot instance
export const cryptoBot = new CryptoBot();

// Main character configuration
export const mainCharacter = {
  clients: ['TWITTER'],
  name: "cognitivedriftt",

  // Handle incoming tweets
  async onTweet(tweet: string) {
    const check = await cryptoBot.checkPriceClaim(tweet);
    if (check) {
      return `Fact Check:
Price claimed: $${check.claimed}
Actual price: $${check.actual}
${check.isAccurate ? '✅ Accurate' : '❌ Inaccurate'} (${check.difference.toFixed(1)}% difference)`;
    }
  },

  // Regular market monitoring
  async onInterval() {
    const alert = await cryptoBot.checkMarket();
    if (alert) {
      return alert;
    }
  }
};