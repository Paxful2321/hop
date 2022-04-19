import { Signer, ethers, BigNumber, BigNumberish } from 'ethers'
import {
  ArbitrumInbox__factory,
  ArbitrumInbox,
  ArbitrumL1ERC20Bridge__factory,
  ArbitrumL1ERC20Bridge,
  L1ArbitrumDaiGateway__factory,
  L1ArbitrumDaiGateway,
  L1OptimismDaiTokenBridge__factory,
  L1OptimismGateway__factory,
  L1OptimismGateway,
  L1OptimismTokenBridge__factory,
  L1OptimismTokenBridge,
  L1PolygonPlasmaBridgeDepositManager__factory,
  L1PolygonPlasmaBridgeDepositManager,
  L1PolygonPosRootChainManager__factory,
  L1PolygonPosRootChainManager,
  L1XDaiForeignOmniBridge__factory,
  L1XDaiForeignOmniBridge,
  L1XDaiPoaBridge__factory,
  L1XDaiPoaBridge,
  L1XDaiWETHOmnibridgeRouter__factory,
  L1XDaiWETHOmnibridgeRouter,
} from '@hop-protocol/core/contracts'
import {
  ChainSlug,
  CanonicalToken,
  TokenModel as Token,
  Token as TokenClass,
  Chain,
  TChain,
  TToken,
  metadata,
  Base,
  L1Factory,
  ChainId,
} from '@hop-protocol/sdk'
import { getL2Network } from '@arbitrum/sdk'
import logger from 'src/logger'
import { formatError } from 'src/utils'
import { getNativeBridgeAddress, initNativeBridge } from 'src/utils/canonicalBridges'

export type L1CanonicalBridge =
  | ArbitrumInbox
  | ArbitrumL1ERC20Bridge
  | L1ArbitrumDaiGateway
  | L1OptimismGateway
  | L1OptimismTokenBridge
  | L1PolygonPlasmaBridgeDepositManager
  | L1PolygonPosRootChainManager
  | L1XDaiForeignOmniBridge
  | L1XDaiPoaBridge
  | L1XDaiWETHOmnibridgeRouter

class CanonicalBridge extends Base {
  public chain: Chain
  public tokenSymbol: CanonicalToken
  address: string
  l2TokenAddress: string
  l1BridgeAddress: string

  constructor(network: string, signer: Signer, token: TToken, chain: TChain) {
    if (!(network && signer && token && chain)) {
      throw new Error('CanonicalBridge missing constructor args')
    }
    super(network, signer)
    this.getSignerOrProvider(Chain.Ethereum, signer).then(s => {
      this.signer = s
    })
    this.chain = this.toChainModel(chain)
    this.tokenSymbol = this.toTokenModel(token).symbol as CanonicalToken
    this.address = this.getL1CanonicalBridgeAddress(this.tokenSymbol, this.chain)
    this.l1BridgeAddress = this.address
    this.l2TokenAddress = this.getL2CanonicalTokenAddress(this.tokenSymbol, this.chain)
  }

  public connect(signer: Signer) {
    return new CanonicalBridge(this.network, signer, this.tokenSymbol, this.chain)
  }

  public async getL1CanonicalAllowance(): Promise<BigNumber> {
    const l1CanonicalToken = this.getL1Token()
    const spender = this.getDepositApprovalAddress()
    if (!spender) {
      throw new Error(`token "${this.tokenSymbol}" on chain "${this.chain.slug}" is unsupported`)
    }
    return l1CanonicalToken.allowance(spender)
  }

  public getDepositApprovalAddress(): string {
    return getNativeBridgeAddress(this.chain.slug, this.tokenSymbol)
  }

  public async estimateApproveTx(amount: BigNumberish) {
    const l1CanonicalToken = this.getL1Token()
    const spender = this.getDepositApprovalAddress()
    const populatedTx = await l1CanonicalToken.populateApproveTx(spender, amount)
    return this.signer.estimateGas(populatedTx)
  }

  public async approve(amount: BigNumberish) {
    amount = amount.toString()
    const l1CanonicalToken = this.getL1Token()

    const spender = this.getDepositApprovalAddress()
    if (!spender) {
      throw new Error(`token "${this.tokenSymbol}" on chain "${this.chain.slug}" is unsupported`)
    }
    return await l1CanonicalToken.approve(spender, amount)
  }

  public async estimateDepositTx(amount: BigNumberish) {
    const populatedTx = await this.populateDepositTx(amount)
    return this.signer.estimateGas(populatedTx)
  }

  public async deposit(amount: BigNumberish, customRecipient?: string) {
    if (this.chain.equals(Chain.Arbitrum) && this.tokenSymbol !== CanonicalToken.ETH) {
      return this.populateDepositTx(amount, customRecipient)
    }
    const populatedTx = await this.populateDepositTx(amount)
    return this.signer.sendTransaction(populatedTx)
  }

  public async populateDepositTx(amount: BigNumberish, customRecipient?: string): Promise<any> {
    amount = amount.toString()
    const signerAddress = await this.getSignerAddress()
    const from = signerAddress
    const recipient = customRecipient || signerAddress
    const l1CanonicalBridge = await this.getL1CanonicalBridge()
    const l1CanonicalToken = this.getL1Token()
    const l2CanonicalTokenAddress = this.getL2CanonicalTokenAddress(this.tokenSymbol, this.chain)
    const coder = ethers.utils.defaultAbiCoder
    const payload = coder.encode(['uint256'], [amount])

    const nativeBridge = await initNativeBridge(this.chain.slug as ChainSlug, this.tokenSymbol)

    switch (this.chain.slug) {
      case ChainSlug.Gnosis: {
        if (this.tokenSymbol === Token.DAI) {
          return (l1CanonicalBridge as L1XDaiPoaBridge).populateTransaction.relayTokens(
            recipient,
            amount,
            {
              // Gnosis requires a higher gas limit
              gasLimit: 500e3,
              from,
            }
          )
        }

        if (this.tokenSymbol === Token.ETH) {
          return (l1CanonicalBridge as L1XDaiWETHOmnibridgeRouter).populateTransaction[
            'wrapAndRelayTokens(address,bytes)'
          ](recipient, payload, {
            // Gnosis requires a higher gas limit
            gasLimit: 500e3,
            from,
            value: amount,
          })
        }

        return (l1CanonicalBridge as L1XDaiForeignOmniBridge).populateTransaction.relayTokens(
          l1CanonicalToken.address,
          recipient,
          amount,
          {
            // Gnosis requires a higher gas limit
            gasLimit: 500e3,
            from,
          }
        )
      }

      case ChainSlug.Optimism: {
        const l2TokenAddress = this.getL2CanonicalTokenAddress(this.tokenSymbol, this.chain)
        if (!l2TokenAddress) {
          throw new Error(
            `token "${this.tokenSymbol}" on chain "${this.chain.slug}" is unsupported`
          )
        }

        const bridge = L1OptimismGateway__factory.connect(l1CanonicalBridge.address, this.signer)
        const l2Gas = BigNumber.from('1920000')

        if (this.tokenSymbol === Token.ETH) {
          const data = '0x'
          return bridge.populateTransaction.depositETHTo(recipient, l2Gas, data, {
            from,
            gasLimit: 500e3,
            value: amount,
          })
        }

        return bridge.populateTransaction.depositERC20To(
          l1CanonicalToken.address,
          l2TokenAddress,
          recipient,
          amount,
          l2Gas,
          payload,
          { from, gasLimit: 500e3 }
        )
      }

      case ChainSlug.Arbitrum: {
        const maxSubmissionPrice = BigNumber.from(500e3)
        const l2Network = await getL2Network(ChainId.Arbitrum)

        if (this.tokenSymbol === Token.ETH) {
          const bridge = await this.getContract(
            ArbitrumInbox__factory,
            l1CanonicalBridge.address,
            this.signer
          )

          return ((bridge as ArbitrumInbox).populateTransaction.depositEth as any)(
            BigNumber.from(maxSubmissionPrice),
            {
              value: amount,
              from,
            }
          )
        }

        const retryableGasArgs = {
          maxSubmissionPrice: BigNumber.from(amount),
          maxGas: BigNumber.from(400e3),
        }
        const depositInputParams = {
          erc20L1Address: l1CanonicalToken.address,
          amount: BigNumber.from(amount),
          destinationAddress: recipient,
          retryableGasArgs,
        }

        try {
          const ethSigner = await this.getSignerOrProvider(Chain.Ethereum, this.signer)
          const arbProvider = await this.getSignerOrProvider(Chain.Arbitrum)

          const depositParams: any = {
            amount: BigNumber.from(amount),
            erc20L1Address: l1CanonicalToken.address,
            l2Provider: arbProvider,
            l1Signer: ethSigner,
            destinationAddress: recipient,
            retryableGasOverrides: retryableGasArgs,
          }

          const bridge = await this.getContract(
            ArbitrumL1ERC20Bridge__factory,
            l1CanonicalBridge.address,
            this.signer
          )

          return ((bridge as ArbitrumL1ERC20Bridge).populateTransaction.deposit as any)(
            l1CanonicalToken.address,
            l2CanonicalTokenAddress,
            from,
            BigNumber.from(amount),
            { from }
          )

          // const tx = await (nativeBridge as Erc20Bridger).deposit(depositParams)
          // console.log(`tx:`, tx)
          // return tx

          // const arbSigner = (arbProvider as any).getUncheckedSigner(from)
          // const arbBridge = await Bridge.init(ethSigner as JsonRpcSigner, arbSigner)
          // console.log(`arbBridge:`, arbBridge)

          // const gasNeeded = await arbBridge.estimateGasDeposit(depositInputParams)
          // const depositTxParams = await arbBridge.getDepositTxParams(depositInputParams)
          // const { maxFeePerGas, gasPrice } = await arbBridge.l1Provider.getFeeData()
          // const price = maxFeePerGas || gasPrice
          // const walletBal = await arbBridge.l1Provider.getBalance(from)

          // if (!price) {
          //   console.log('Warning: could not get gas price estimate; will try depositing anyway')
          // } else {
          //   const fee = price.mul(gasNeeded)
          //   if (fee.gt(walletBal)) {
          //     console.log(
          //       `An estimated ${utils.formatEther(
          //         fee
          //       )} ether is needed for deposit; you only have ${utils.formatEther(
          //         walletBal
          //       )} ether. Will try depositing anyway:`
          //     )
          //   }
          // }

          // return arbBridge.l1Bridge.deposit(depositTxParams)
        } catch (error) {
          logger.error(formatError(error))
        }
        break
      }

      case ChainSlug.Polygon: {
        if (this.tokenSymbol === Token.MATIC) {
          return (
            l1CanonicalBridge as L1PolygonPlasmaBridgeDepositManager
          ).populateTransaction.depositERC20ForUser(
            l1CanonicalToken.address,
            signerAddress,
            payload,
            {
              from,
              gasLimit: 250e3,
            }
          )
        }

        if (this.tokenSymbol === Token.ETH) {
          return (
            l1CanonicalBridge as L1PolygonPosRootChainManager
          ).populateTransaction.depositEtherFor(signerAddress, { from, value: amount })
        }

        return (l1CanonicalBridge as L1PolygonPosRootChainManager).populateTransaction.depositFor(
          signerAddress,
          l1CanonicalToken.address,
          payload,
          { from, gasLimit: 250e3 }
        )
      }
    }
  }

  async getL1CanonicalBridge(): Promise<L1CanonicalBridge> {
    let factory: L1Factory

    if (this.chain.equals(Chain.Gnosis)) {
      if (this.tokenSymbol === Token.DAI) {
        factory = L1XDaiPoaBridge__factory
      } else if (this.tokenSymbol === Token.ETH) {
        factory = L1XDaiWETHOmnibridgeRouter__factory
      } else {
        factory = L1XDaiForeignOmniBridge__factory
      }
    } else if (this.chain.equals(Chain.Optimism)) {
      if (this.tokenSymbol === Token.DAI) {
        factory = L1OptimismDaiTokenBridge__factory
      }
      factory = L1OptimismTokenBridge__factory
    } else if (this.chain.equals(Chain.Arbitrum)) {
      if (this.tokenSymbol === Token.ETH) {
        factory = ArbitrumInbox__factory
      } else if (this.tokenSymbol === Token.DAI) {
        factory = L1ArbitrumDaiGateway__factory
      } else {
        factory = ArbitrumL1ERC20Bridge__factory
      }
    } else {
      if (this.tokenSymbol === Token.MATIC) {
        factory = L1PolygonPlasmaBridgeDepositManager__factory
      } else {
        factory = L1PolygonPosRootChainManager__factory
      }
    }

    return (factory as any).connect(this.address, this.signer)
  }

  public getL1Token() {
    return this.toCanonicalToken(this.tokenSymbol, this.network, Chain.Ethereum).connect(
      this.signer
    )
  }

  public toCanonicalToken(token: TToken, network: string, chain: TChain) {
    token = this.toTokenModel(token)
    chain = this.toChainModel(chain)
    const { name, symbol, decimals, image } = metadata.tokens[network][token.canonicalSymbol]
    let address
    if (chain.isL1) {
      const l1CanonicalToken = this.getL1CanonicalTokenAddress(token.symbol, chain.slug)
      address = l1CanonicalToken
    } else {
      const l2CanonicalToken = this.getL2CanonicalTokenAddress(token.symbol, chain.slug)
      address = l2CanonicalToken
    }

    return new TokenClass(network, chain, address, decimals, symbol, name, image)
  }
}

export default CanonicalBridge
