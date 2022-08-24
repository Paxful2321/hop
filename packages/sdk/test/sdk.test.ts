import Token from '../src/models/Token'
import { BigNumber, Wallet, constants, providers } from 'ethers'
import {
  Chain,
  Hop
} from '../src/index'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { privateKey } from './config'
import * as addresses from '@hop-protocol/core/addresses'
// @ts-ignore
import pkg from '../package.json'

describe('sdk setup', () => {
  const hop = new Hop('kovan')
  const signer = new Wallet(privateKey)
  it('should return version', () => {
    expect(hop.version).toBe(pkg.version)
  })
})

describe.skip('hop bridge token transfers', () => {
  const hop = new Hop('kovan')
  const signer = new Wallet(privateKey)
  it(
    'send token from L1 -> L2',
    async () => {
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Ethereum, Chain.Optimism)

      console.log('tx hash:', tx?.hash)

      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'send token from L2 -> L2',
    async () => {
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Optimism, Chain.Gnosis)

      console.log('tx hash:', tx?.hash)

      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'send token from L2 -> L1',
    async () => {
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Gnosis, Chain.Ethereum)

      console.log('tx hash:', tx?.hash)

      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
})

describe.skip('tx watcher', () => {
  const hop = new Hop('mainnet')
  const signer = new Wallet(privateKey)
  it(
    'receive events on token transfer from L1 -> L2 (no swap)',
    async () => {
      const txHash =
        '0xb92c61e0a1e674eb4c9a52cc692c92709c8a4e4cb66fb22eb7cd9a958cf33a70'
      console.log('tx hash:', txHash)

      await new Promise(resolve => {
        let sourceReceipt: any = null
        let destinationReceipt: any = null

        hop
          .watch(txHash, Token.USDC, Chain.Ethereum, Chain.Polygon)
          .on('receipt', (data: any) => {
            const { receipt, chain } = data
            if (chain.equals(Chain.Ethereum)) {
              sourceReceipt = receipt
              console.log('got source transaction receipt')
            }
            if (chain.equals(Chain.Polygon)) {
              destinationReceipt = receipt
              console.log('got destination transaction receipt')
            }
            if (sourceReceipt && destinationReceipt) {
              resolve(null)
            }
          })
          .on('error', (err: Error) => {
            console.error(err)
            // expect(err).toBeFalsy()
          })
      })
    },
    120 * 1000
  )
  it.skip(
    'receive events on token transfer from L1 -> L2 Gnosis (swap)',
    async () => {
      /*
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Ethereum, Chain.Gnosis)
      */

      const txHash =
        '0xda9be66e99f9b668de873aeb7b82dc0d7870188862cbf86c52a00d7f61be0be4'
      console.log('tx hash:', txHash)

      console.log('waiting for receipts')

      await new Promise(resolve => {
        let sourceReceipt: any = null
        let destinationReceipt: any = null

        hop
          .watch(txHash, Token.USDC, Chain.Ethereum, Chain.Gnosis)
          .on('receipt', (data: any) => {
            const { receipt, chain } = data
            if (chain.equals(Chain.Ethereum)) {
              sourceReceipt = receipt
              console.log('got source transaction receipt')
            }
            if (chain.equals(Chain.Gnosis)) {
              destinationReceipt = receipt
              console.log('got destination transaction receipt')
            }
            if (sourceReceipt && destinationReceipt) {
              resolve(null)
            }
          })
          .on('error', (err: Error) => {
            console.error(err)
          })
      })
    },
    120 * 1000
  )
  it.skip(
    'receive events on token transfer from L2 -> L2',
    async () => {
      const tokenAmount = parseUnits('0.1', 18)
      /*
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Gnosis, Chain.Optimism)
      const txHash = tx?.hash
      console.log('tx hash:', txHash)
      console.log('waiting for receipts')
        */

      const txHash = '0xf5d14a332d072de887bbe3dd058c8eb64f3aa754b7652f76179c230ab1391948'
      console.log('tx hash:', txHash)

      await new Promise(resolve => {
        let sourceReceipt: any = null
        let destinationReceipt: any = null

        hop
          .watch(txHash, Token.USDC, Chain.Gnosis, Chain.Optimism, false, {
            // destinationHeadBlockNumber: 5661102
          })
          .on('receipt', (data: any) => {
            const { receipt, chain } = data
            if (chain.equals(Chain.Gnosis)) {
              sourceReceipt = receipt
              console.log(
                'got source transaction receipt:',
                receipt.transactionHash
              )
            }
            if (chain.equals(Chain.Optimism)) {
              destinationReceipt = receipt
              console.log(
                'got destination transaction receipt:',
                receipt.transactionHash
              )
            }
            if (sourceReceipt && destinationReceipt) {
              resolve(null)
            }
          })
      })

      expect(txHash).toBeTruthy()
    },
    120 * 1000
  )
  it.skip(
    'receive events on token transfer from L2 -> L2 (Optimism -> Arbitrum)',
    async () => {
      const tokenAmount = parseUnits('0.1', 18)
      /*
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Gnosis, Chain.Optimism)
      const txHash = tx?.hash
      console.log('tx hash:', txHash)
      console.log('waiting for receipts')
        */

      const txHash = '0x0be35c18107c85f13b8c50bcb045c77a184115d24424daa48f5b76ea230a926e'
      console.log('tx hash:', txHash)

      await new Promise(resolve => {
        let sourceReceipt: any = null
        let destinationReceipt: any = null

        hop
          .watch(txHash, Token.ETH, Chain.Optimism, Chain.Arbitrum, false, {
            // destinationHeadBlockNumber: 5661102
          })
          .on('receipt', (data: any) => {
            console.log(data)
            const { receipt, chain } = data
            if (chain.equals(Chain.Optimism)) {
              sourceReceipt = receipt
              console.log(
                'got source transaction receipt:',
                receipt.transactionHash
              )
            }
            if (chain.equals(Chain.Arbitrum)) {
              destinationReceipt = receipt
              console.log(
                'got destination transaction receipt:',
                receipt.transactionHash
              )
            }
            if (sourceReceipt && destinationReceipt) {
              resolve(null)
            }
          })
      })

      expect(txHash).toBeTruthy()
    },
    20 * 60 * 1000
  )
  it.skip(
    '(mainnet) receive events on token transfer from L2 Gnosis -> L2 Polygon',
    async () => {
      const tokenAmount = parseUnits('0.1', 18)
      const txHash =
        '0x439ae4839621e13317933e1fa4ca9adab359074090e00e3db1105a982cf9a6ac'

      await new Promise(resolve => {
        let sourceReceipt: any = null
        let destinationReceipt: any = null

        hop
          .watch(txHash, Token.USDC, Chain.Gnosis, Chain.Polygon, false, {
            destinationHeadBlockNumber: 14779300 // estimate
          })
          .on('receipt', (data: any) => {
            const { receipt, chain } = data
            if (chain.equals(Chain.Gnosis)) {
              sourceReceipt = receipt
              console.log(
                'got source transaction receipt:',
                receipt.transactionHash
              )
              expect(sourceReceipt.transactionHash).toBe(
                '0x439ae4839621e13317933e1fa4ca9adab359074090e00e3db1105a982cf9a6ac'
              )
            }
            if (chain.equals(Chain.Polygon)) {
              destinationReceipt = receipt
              console.log(
                'got destination transaction receipt:',
                receipt.transactionHash
              )
              expect(destinationReceipt.transactionHash).toBe(
                '0xdcdf05b4171610bab3b69465062e29fab4d6ea3a70ea761336d1fa566dede4a7'
              )
            }
            if (sourceReceipt && destinationReceipt) {
              resolve(null)
            }
          })
      })

      expect(txHash).toBeTruthy()
    },
    300 * 1000
  )
  it.skip(
    'receive events on token transfer from L2 -> L1',
    async () => {
      /*
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .send(tokenAmount, Chain.Ethereum, Chain.Gnosis)
      console.log('tx hash:', tx?.hash)
      console.log('waiting for receipts')
        */

      const txHash = '0x6c9f8082a76ed7362cbd52ba93add0ba9e5b8af5c1a35d83378163dc30906f64'
      console.log('tx hash:', txHash)

      await new Promise(resolve => {
        let sourceReceipt: any = null
        let destinationReceipt: any = null

        hop
          .watch(txHash, Token.USDC, Chain.Gnosis, Chain.Ethereum)
          .on('receipt', (data: any) => {
            const { receipt, chain } = data
            if (chain.equals(Chain.Gnosis)) {
              sourceReceipt = receipt
              console.log('got source transaction receipt')
            }
            if (chain.equals(Chain.Ethereum)) {
              destinationReceipt = receipt
              console.log('got destination transaction receipt')
            }
            if (sourceReceipt && destinationReceipt) {
              resolve(null)
            }
          })
      })

      expect(txHash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'getAmountOut - L2 -> L2',
    async () => {
      const tokenAmount = parseUnits('1', 18)
      const amountOut = await hop
        .connect(signer)
        .bridge(Token.USDC)
        .getAmountOut(tokenAmount, Chain.Gnosis, Chain.Optimism)

      expect(Number(formatUnits(amountOut.toString(), 18))).toBeGreaterThan(0)
    },
    10 * 1000
  )
})

describe.skip('canonical bridge transfers', () => {
  const hop = new Hop('kovan')
  const signer = new Wallet(privateKey)
  it(
    'deposit token from L1 -> Gnosis L2 canonical bridge',
    async () => {
      const bridge = hop.canonicalBridge(Token.USDC, Chain.Gnosis)
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await bridge.connect(signer).deposit(tokenAmount)
      console.log('tx:', tx.hash)
      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'withdraw token from Gnosis L2 canonical bridge -> L1',
    async () => {
      const bridge = hop.canonicalBridge(Token.USDC, Chain.Gnosis)
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await bridge.connect(signer).withdraw(tokenAmount)
      console.log('tx:', tx.hash)
      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'deposit token from L1 -> Optimism L2 canonical bridge',
    async () => {
      const bridge = hop.canonicalBridge(Token.USDC, Chain.Optimism)
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await bridge.connect(signer).deposit(tokenAmount)
      console.log('tx:', tx.hash)
      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'withdraw token from Optimism L2 canonical bridge -> L1',
    async () => {
      const bridge = hop.canonicalBridge(Token.USDC, Chain.Optimism)
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await bridge.connect(signer).withdraw(tokenAmount)
      console.log('tx:', tx.hash)
      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'deposit token from L1 -> Arbitrum L2 canonical bridge',
    async () => {
      const bridge = hop.canonicalBridge(Token.USDC, Chain.Arbitrum)
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await bridge.connect(signer).deposit(tokenAmount)
      console.log('tx:', tx.hash)
      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
  it(
    'withdraw token from Arbitrum L2 canonical bridge -> L1',
    async () => {
      const bridge = hop.canonicalBridge(Token.USDC, Chain.Arbitrum)
      const tokenAmount = parseUnits('0.1', 18)
      const tx = await bridge.connect(signer).withdraw(tokenAmount)
      console.log('tx:', tx.hash)
      expect(tx.hash).toBeTruthy()
    },
    120 * 1000
  )
})

describe.skip('liqudity provider', () => {
  const hop = new Hop('kovan')
  const signer = new Wallet(privateKey)
  it('should add liqudity on Gnosis', async () => {
    const bridge = hop.bridge(Token.USDC)
    const tokenAmount = parseUnits('0.1', 18)
    const amount0Desired = tokenAmount
    const amount1Desired = tokenAmount
    const tx = await bridge
      .connect(signer)
      .addLiquidity(amount0Desired, amount1Desired, Chain.Gnosis)
    console.log('tx:', tx.hash)
    expect(tx.hash).toBeTruthy()
  })
  it('should remove liqudity on Gnosis', async () => {
    const bridge = hop.bridge(Token.USDC)
    const liqudityTokenAmount = parseUnits('0.1', 18)
    const tx = await bridge
      .connect(signer)
      .removeLiquidity(liqudityTokenAmount, Chain.Gnosis)
    console.log('tx:', tx.hash)
    expect(tx.hash).toBeTruthy()
  })
})

describe('custom addresses', () => {
  it('should set custom addresses', () => {
    const address = '0x1111111111111111111111111111111111111111'
    const newAddresses = Object.assign({}, addresses)
    newAddresses.mainnet.bridges.USDC.gnosis.l2CanonicalToken = address

    const sdk = new Hop('mainnet')
    sdk.setConfigAddresses(newAddresses.mainnet)
    expect(sdk.getL2CanonicalTokenAddress('USDC', 'gnosis')).toBe(address)

    const bridge = sdk.bridge('USDC')
    expect(bridge.getL2CanonicalTokenAddress('USDC', 'gnosis')).toBe(address)
  })
})

describe('approve addresses', () => {
  const sdk = new Hop('mainnet')
  const bridge = sdk.bridge('USDC')
  it('get send approval address (L1 -> L2)', () => {
    const approvalAddress = bridge.getSendApprovalAddress(
      Chain.Ethereum
    )
    const expectedAddress = addresses.mainnet.bridges.USDC.ethereum.l1Bridge
    expect(approvalAddress).toBe(expectedAddress)
  })
  it('get send approval address (L2 -> L2)', () => {
    const approvalAddress = bridge.getSendApprovalAddress(
      Chain.Polygon
    )
    const expectedAddress = addresses.mainnet.bridges.USDC.polygon.l2AmmWrapper
    expect(approvalAddress).toBe(expectedAddress)
  })
})

describe('custom chain providers', () => {
  it('should set custom chain provider', () => {
    const sdk = new Hop('mainnet')
    const bridge = sdk.bridge('USDC')
    let provider = bridge.getChainProvider('polygon')
    const currentUrl = 'https://polygon-rpc.com'
    const newUrl = 'https://polygon-rpc2.com'
    expect((provider as any).connection.url).toBe(currentUrl)
    const newProvider = new providers.StaticJsonRpcProvider(newUrl)
    sdk.setChainProvider('polygon', newProvider)
    provider = bridge.getChainProvider('polygon')
    expect((provider as any).connection.url).toBe(newUrl)
  })
  it('should set multiple custom chain provider', () => {
    const sdk = new Hop('mainnet')
    const bridge = sdk.bridge('USDC')
    let polygonProvider = bridge.getChainProvider('polygon')
    let gnosisProvider = bridge.getChainProvider('gnosis')
    const currentPolygonUrl = 'https://polygon-rpc.com'
    const currentGnosisUrl = 'https://rpc.gnosischain.com/'
    const newPolygonUrl = 'https://polygon-rpc2.com'
    const newGnosisUrl = 'https://rpc.gnosischain2.com'
    expect((polygonProvider as any).connection.url).toBe(currentPolygonUrl)
    expect((gnosisProvider as any).connection.url).toBe(currentGnosisUrl)
    sdk.setChainProviders({
      polygon: new providers.StaticJsonRpcProvider(newPolygonUrl),
      gnosis: new providers.StaticJsonRpcProvider(newGnosisUrl)
    })
    polygonProvider = bridge.getChainProvider('polygon')
    gnosisProvider = bridge.getChainProvider('gnosis')
    expect((polygonProvider as any).connection.url).toBe(newPolygonUrl)
    expect((gnosisProvider as any).connection.url).toBe(newGnosisUrl)
  })
})

describe.skip('getSendData', () => {
  it('available liquidity', async () => {
    const sdk = new Hop('mainnet')
    const bridge = sdk.bridge('USDC')
    const availableLiquidityBn = await bridge.getFrontendAvailableLiquidity(
      Chain.Arbitrum,
      Chain.Ethereum
    )
    const sendData = await bridge.getSendData(
      '1000000000',
      Chain.Arbitrum,
      Chain.Ethereum
    )
    const requiredLiquidity = Number(
      formatUnits(sendData.requiredLiquidity.toString(), 6)
    )
    const availableLiquidity = Number(
      formatUnits(availableLiquidityBn.toString(), 6)
    )
    expect(availableLiquidity).toBeGreaterThan(0)
    expect(requiredLiquidity).toBeGreaterThan(0)
    expect(availableLiquidity).toBeGreaterThan(requiredLiquidity)
  })
  it('relayer fee', async () => {
    const sdk = new Hop('mainnet')
    const bridge = sdk.bridge('USDC')
    const amountIn = BigNumber.from('1000000')
    const sendData = await bridge.getSendData(
      amountIn,
      Chain.Ethereum,
      Chain.Arbitrum
    )
    const adjustedBonderFee = Number(
      formatUnits(sendData.adjustedBonderFee.toString(), 6)
    )
    const adjustedDestinationTxFee = Number(
      formatUnits(sendData.adjustedDestinationTxFee.toString(), 6)
    )
    const totalFee = Number(
      formatUnits(sendData.totalFee.toString(), 6)
    )

    expect(adjustedBonderFee).toBe(0)
    expect(adjustedDestinationTxFee).toBe(0)
    expect(totalFee).toBeGreaterThan(0)
  })
})

describe('getSupportedAssets', () => {
  it('should return list of supported assets per chain', () => {
    const hop = new Hop('mainnet')
    const assets = hop.getSupportedAssets()
    expect(assets).toBeTruthy()
  })
})

describe.skip('get call data only (no signer connected)', () => {
  it('should return call data for L1->L2 ETH send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('ETH')
    const amount = parseUnits('0.01', 18)
    const sourceChain = 'ethereum'
    const destinationChain = 'gnosis'
    const recipient = constants.AddressZero
    const txObj = await bridge.populateSendTx(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(txObj.value).toBeTruthy()
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
  it('should return call data for L1->L2 USDC send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const amount = parseUnits('150', 6)
    const sourceChain = 'ethereum'
    const destinationChain = 'gnosis'
    const recipient = constants.AddressZero
    const txObj = await bridge.populateSendTx(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(txObj.value).toBeFalsy()
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
  it('should return call data for L2->L2 USDC send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const amount = parseUnits('1', 6)
    const sourceChain = 'gnosis'
    const destinationChain = 'polygon'
    const recipient = constants.AddressZero
    const txObj = await bridge.populateSendTx(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(txObj.value).toBeFalsy()
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
  it('should return call data for L2->L1 USDC send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const amount = parseUnits('150', 6)
    const sourceChain = 'gnosis'
    const destinationChain = 'ethereum'
    const recipient = constants.AddressZero
    const txObj = await bridge.populateSendTx(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(txObj.value).toBeFalsy()
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
  it('should return call data for add liquidity call', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const sourceChain = 'gnosis'
    const amount = parseUnits('1', 6)
    const txObj = await bridge.populateSendApprovalTx(amount, sourceChain)
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
  it('should return call data for add liquidity call', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const chain = 'gnosis'
    const amm = await bridge.getAmm(chain)
    const amount0 = parseUnits('1', 6)
    const amount1 = parseUnits('1', 6)
    const minToMint = BigNumber.from(0)
    const txObj = await amm.populateAddLiquidityTx(amount0, amount1, minToMint)
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
  it('should return call data for remove liquidity call', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const chain = 'gnosis'
    const amm = await bridge.getAmm(chain)
    const lpTokenAmount = parseUnits('1', 18)
    const amount0Min = BigNumber.from(0)
    const amount1Min = BigNumber.from(0)
    const txObj = await amm.populateRemoveLiquidityTx(lpTokenAmount, amount0Min, amount1Min)
    expect(txObj.data).toBeTruthy()
    expect(txObj.to).toBeTruthy()
  }, 30 * 1000)
})

describe.skip('get estimated gas (no signer connected)', () => {
  it('should return estimated gas for L1->L2 send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const amount = parseUnits('1', 6)
    const sourceChain = 'ethereum'
    const destinationChain = 'gnosis'
    const recipient = constants.AddressZero
    const estimatedGas = await bridge.estimateSendGasLimit(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(estimatedGas.gt(0)).toBeTruthy()
  })
  it('should return estimated gas for L2->L2 send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const amount = parseUnits('1', 6)
    const sourceChain = 'gnosis'
    const destinationChain = 'polygon'
    const recipient = constants.AddressZero
    const estimatedGas = await bridge.estimateSendGasLimit(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(estimatedGas.gt(0)).toBeTruthy()
  })
  it('should return estimated gas for L2->L1 send', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const amount = parseUnits('100', 6)
    const sourceChain = 'gnosis'
    const destinationChain = 'ethereum'
    const recipient = constants.AddressZero
    const estimatedGas = await bridge.estimateSendGasLimit(amount, sourceChain, destinationChain, {
      recipient
    })
    expect(estimatedGas.gt(0)).toBeTruthy()
  })
})

describe.skip('PriceFeed', () => {
  it('should return price', async () => {
    const hop = new Hop('mainnet')
    hop.setPriceFeedApiKeys({
      // coingecko: '123'
    })
    const bridge = hop.bridge('USDC')
    const price = await bridge.priceFeed.getPriceByTokenSymbol('USDC')
    console.log(price)
    expect(price).toBeGreaterThan(0)
    expect(price).toBeLessThan(2)
  })
})

describe.skip('getMessengerWrapperAddress', () => {
  it('should return the messenger wrapper', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('ETH')
    const destinationChain = 'arbitrum'
    const messengerWrapper = await bridge.getMessengerWrapperAddress(destinationChain)
    console.log(messengerWrapper)
    expect(messengerWrapper).toBeTruthy()
    expect(messengerWrapper.length).toBe(42)
  })
  it('should not return the messenger wrapper for mainnet because one does not exist', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('ETH')
    const destinationChain = 'ethereum'
    const messengerWrapper = await bridge.getMessengerWrapperAddress(destinationChain)
    console.log(messengerWrapper)
    expect(messengerWrapper).toBeFalsy()
  })
})

describe.skip('Apr', () => {
  it('should return apr', async () => {
    const hop = new Hop('mainnet')
    const token = 'USDC'
    const chain = 'gnosis'
    const bridge = hop.bridge(token)
    /*
    bridge.setChainProviderUrls({
      gnosis: '',
      optimism: ''
    })
    */
    const amm = bridge.getAmm(chain)
    const apr = await amm.getApr()
    console.log(token, chain, apr)
    expect(apr).toBeGreaterThan(0)
    expect(apr).toBeLessThan(50)
  }, 10 * 60 * 1000)
})

describe('getWaitConfirmations', () => {
  it('should return waitConfirmations', () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    expect(bridge.getWaitConfirmations('polygon')).toBe(256)
  })
})

describe('getExplorerUrl', () => {
  it('should return explorer url for transfer id', () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    expect(bridge.getExplorerUrlForTransferId('0x3686977a4c3ce1e42b2cc113f2889723d95251d55b874910fd97ef6b16982024')).toBe('https://explorer.hop.exchange/?transferId=0x3686977a4c3ce1e42b2cc113f2889723d95251d55b874910fd97ef6b16982024')
  })
})

describe('getTransferStatus', () => {
  it('should return status for transfer id', async () => {
    const hop = new Hop('mainnet')
    const bridge = hop.bridge('USDC')
    const status = await bridge.getTransferStatus('0x198cf61a0dfa6d86e9b3b2b92a10df33acd8a4b722c8d670b8c94638d590d3c5180')
    expect(status.sourceChainSlug).toBe('ethereum')
    expect(status.bonded).toBe(true)
  })
})
