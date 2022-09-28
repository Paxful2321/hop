import CoinGecko from './CoinGecko'
import Coinbase from './Coinbase'

const cache: {
  [tokenSymbol: string]: {
    timestamp: number
    price: number
  }
} = {}

export type ApiKeys = {
  coingecko?: string
}

interface Service {
  getPriceByTokenSymbol(symbol: string): Promise<number>
}

class PriceFeed {
  cacheTimeMs = 5 * 60 * 1000
  apiKeys: ApiKeys = {}
  services: Service[] = []

  aliases: { [tokenSymbol: string]: string } = {
    WETH: 'ETH',
    WMATIC: 'MATIC',
    XDAI: 'DAI',
    WXDAI: 'DAI'
  }

  constructor (apiKeysMap: ApiKeys = {}) {
    if (apiKeysMap) {
      this.apiKeys = apiKeysMap
    }
    this.setServices()
  }

  setApiKeys (apiKeysMap: ApiKeys = {}) {
    this.apiKeys = apiKeysMap
    this.setServices()
  }

  private setServices () {
    this.services = [new CoinGecko(this.apiKeys?.coingecko), new Coinbase()]
  }

  async getPriceByTokenSymbol (tokenSymbol: string) {
    if (this.aliases[tokenSymbol]) {
      tokenSymbol = this.aliases[tokenSymbol]
    }

    const cached = cache[tokenSymbol]
    if (cached) {
      const isRecent = cached.timestamp > Date.now() - this.cacheTimeMs
      if (isRecent) {
        return cached.price
      }
    }

    const errors: Error[] = []
    for (const service of this.services) {
      try {
        const price = await service.getPriceByTokenSymbol(tokenSymbol)
        if (price === null) {
          throw new Error(`null price for ${tokenSymbol}`)
        }
        cache[tokenSymbol] = {
          timestamp: Date.now(),
          price
        }
        return price
      } catch (err) {
        const isLastService = this.services.indexOf(service) === this.services.length - 1
        errors.push(err.message)
        if (isLastService) {
          throw new Error(`PriceFeed error(s): ${errors.join(' ')}`)
        }
      }
    }
  }
}

export default PriceFeed
