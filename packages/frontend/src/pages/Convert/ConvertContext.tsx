import React, { FC, createContext, useContext, useState, useMemo, useEffect } from 'react'
import { BigNumber } from 'ethers'
import { parseUnits, formatUnits } from 'ethers/lib/utils'
import { useLocation } from 'react-router-dom'
import { HopBridge, Token } from '@hop-protocol/sdk'
import Network from 'src/models/Network'
import Transaction from 'src/models/Transaction'
import { useApp } from 'src/contexts/AppContext'
import { useWeb3Context } from 'src/contexts/Web3Context'
import { UINT256 } from 'src/constants'
import logger from 'src/logger'
import ConvertOption from 'src/pages/Convert/ConvertOption'
import AmmConvertOption from 'src/pages/Convert/ConvertOption/AmmConvertOption'
import HopConvertOption from 'src/pages/Convert/ConvertOption/HopConvertOption'
import NativeConvertOption from 'src/pages/Convert/ConvertOption/NativeConvertOption'
import useBalance from 'src/hooks/useBalance'
import { commafy } from 'src/utils'

type ConvertContextProps = {
  convertOptions: ConvertOption[]
  convertOption: ConvertOption | undefined
  networks: Network[]
  l2Networks: Network[]
  selectedNetwork: Network | undefined
  setSelectedNetwork: (network: Network | undefined) => void
  sourceNetwork: Network | undefined
  destNetwork: Network | undefined
  sourceToken: Token | undefined
  destToken: Token | undefined
  sourceTokenAmount: string | undefined
  setSourceTokenAmount: (value: string) => void
  destTokenAmount: string | undefined
  setDestTokenAmount: (value: string) => void
  convertTokens: () => void
  validFormFields: boolean
  sending: boolean
  sendButtonText: string
  sourceBalance: BigNumber | undefined
  loadingSourceBalance: boolean
  destBalance: BigNumber | undefined
  loadingDestBalance: boolean
  switchDirection: () => void
  error: string | undefined
  setError: (error: string | undefined) => void
  tx: Transaction | undefined
  setTx: (tx: Transaction | undefined) => void
}

const ConvertContext = createContext<ConvertContextProps>({
  convertOptions: [],
  convertOption: undefined,
  networks: [],
  l2Networks: [],
  selectedNetwork: undefined,
  setSelectedNetwork: (network: Network | undefined) => {},
  sourceNetwork: undefined,
  destNetwork: undefined,
  sourceToken: undefined,
  destToken: undefined,
  sourceTokenAmount: undefined,
  setSourceTokenAmount: (value: string) => {},
  destTokenAmount: undefined,
  setDestTokenAmount: (value: string) => {},
  convertTokens: () => {},
  validFormFields: false,
  sending: false,
  sendButtonText: '',
  sourceBalance: undefined,
  loadingSourceBalance: false,
  destBalance: undefined,
  loadingDestBalance: false,
  switchDirection: () => {},
  error: undefined,
  setError: (error: string | undefined) => {},
  tx: undefined,
  setTx: (tx: Transaction | undefined) => {},
})

const ConvertContextProvider: FC = ({ children }) => {
  const { provider, checkConnectedNetworkId } = useWeb3Context()
  const app = useApp()
  const { networks, selectedBridge, txConfirm, sdk, l1Network } = app
  const { pathname } = useLocation()

  const convertOptions = useMemo(() => {
    return [
      new AmmConvertOption(),
      new HopConvertOption(),
      new NativeConvertOption()
    ]
  }, [])
  const convertOption = useMemo(() => {
    return convertOptions.find(option =>
      pathname.includes(option.path)
    ) || convertOptions[0]
  }, [pathname])
  const l2Networks = networks.filter((network: Network) => !network.isLayer1)
  const [selectedNetwork, setSelectedNetwork] = useState<Network | undefined>(
    l2Networks[0]
  )
  const [isForwardDirection, setIsForwardDirection] = useState(true)
  const switchDirection = () => {
    setIsForwardDirection(!isForwardDirection)
  }
  const sourceNetwork = useMemo<Network | undefined>(() => {
    if (convertOption instanceof AmmConvertOption || !isForwardDirection) {
      return selectedNetwork
    } else {
      return l1Network
    }
  }, [isForwardDirection, selectedNetwork, l1Network, convertOption])
  const destNetwork = useMemo<Network | undefined>(() => {
    if (convertOption instanceof AmmConvertOption || isForwardDirection) {
      return selectedNetwork
    } else {
      return l1Network
    }
  }, [isForwardDirection, selectedNetwork, l1Network, convertOption])
  const [sourceTokenAmount, setSourceTokenAmount] = useState<string>('')
  const [destTokenAmount, setDestTokenAmount] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)

  const [sourceToken, setSourceToken] = useState<Token>()
  const [destToken, setDestToken] = useState<Token>()

  useEffect(() => {
    const fetchToken = async () => {
      const token = await convertOption.sourceToken(isForwardDirection, selectedNetwork, selectedBridge)
      setSourceToken(token)
    }

    fetchToken()
  }, [convertOption, isForwardDirection, selectedNetwork, selectedBridge])

  useEffect(() => {
    const fetchToken = async () => {
      const token = await convertOption.destToken(isForwardDirection, selectedNetwork, selectedBridge)
      setDestToken(token)
    }

    fetchToken()
  }, [convertOption, isForwardDirection, selectedNetwork, selectedBridge])

  const { balance: sourceBalance, loading: loadingSourceBalance } = useBalance(
    sourceToken,
    sourceNetwork
  )
  const { balance: destBalance, loading: loadingDestBalance } = useBalance(
    destToken,
    destNetwork
  )
  const [error, setError] = useState<string | undefined>(undefined)
  const [tx, setTx] = useState<Transaction | undefined>()

  useEffect(() => {
    const calcAmountOut = async () => {
      setError(undefined)
      if (
        !selectedBridge ||
        !Number(sourceTokenAmount) ||
        !sourceNetwork ||
        !destNetwork ||
        !sourceToken
      ) {
        setDestTokenAmount('')
        return
      }

      const value = parseUnits(
        sourceTokenAmount,
        sourceToken.decimals
      ).toString()

      const amountOut = await convertOption.calcAmountOut(
        sdk,
        sourceNetwork,
        destNetwork,
        isForwardDirection,
        selectedBridge.getTokenSymbol(),
        value
      )

      let formattedAmount = formatUnits(amountOut, sourceToken.decimals)
      formattedAmount = commafy(formattedAmount, 5)

      setDestTokenAmount(formattedAmount)
    }

    calcAmountOut()
  }, [sourceTokenAmount, selectedBridge, selectedNetwork, convertOption, isForwardDirection])

  const approveTokens = async (): Promise<any> => {
    if (!sourceToken) {
      throw new Error('No source token selected')
    }

    const targetAddress = await convertOption.getTargetAddress(
      sdk,
      selectedBridge?.getTokenSymbol(),
      sourceNetwork,
      destNetwork
    )

    const parsedAmount = parseUnits(sourceTokenAmount, sourceToken.decimals)
    const approved = await sourceToken.allowance(
      targetAddress
    )

    let tx: any
    if (approved.lt(parsedAmount)) {
      tx = await txConfirm?.show({
        kind: 'approval',
        inputProps: {
          sourceTokenAmount,
          tokenSymbol: sourceToken.symbol
        },
        onConfirm: async (approveAll: boolean) => {
          const approveAmount = approveAll ? UINT256 : parsedAmount
          return sourceToken.approve(
            targetAddress,
            approveAmount
          )
        }
      })
    }

    if (tx?.hash && sourceNetwork) {
      app?.txHistory?.addTransaction(
        new Transaction({
          hash: tx?.hash,
          networkName: sourceNetwork.slug
        })
      )
    }
    await tx?.wait()
    return tx
  }

  const convertTokens = async () => {
    try {
      setTx(undefined)
      const networkId = Number(sourceNetwork?.networkId)
      const isNetworkConnected = await checkConnectedNetworkId(networkId)
      if (!isNetworkConnected) return

      setError(undefined)
      if (
        !Number(sourceTokenAmount) ||
        !sourceNetwork ||
        !destNetwork ||
        !sourceToken ||
        !selectedBridge
      ) {
        return
      }

      setSending(true)

      const signer = provider?.getSigner()
      const value = parseUnits(
        sourceTokenAmount,
        sourceToken.decimals
      ).toString()
      const l1Bridge = await selectedBridge.getL1Bridge()
      const isCanonicalTransfer = false

      const tx = await txConfirm?.show({
        kind: 'convert',
        inputProps: {
          source: {
            amount: sourceTokenAmount,
            token: sourceToken
          },
          dest: {
            amount: destTokenAmount,
            token: sourceToken
          }
        },
        onConfirm: async () => {
          await approveTokens()

          if (!selectedBridge) {
            throw new Error('Bridge is required to convert')
          }

          if (!signer) {
            throw new Error('Signer is required to convert')
          }

          if (!sourceToken) {
            throw new Error('Token is required to convert')
          }

          convertOption.convert(
            sdk,
            signer,
            sourceNetwork,
            destNetwork,
            isForwardDirection,
            selectedBridge.getTokenSymbol(),
            value
          )
        }
      })

      if (tx?.hash && sourceNetwork?.name) {
        const txObj = new Transaction({
            hash: tx?.hash,
            networkName: sourceNetwork.slug,
            destNetworkName: destNetwork.slug,
            token: sourceToken,
            isCanonicalTransfer
          })
        // don't set tx status modal if it's tx to the same chain
        if (sourceNetwork.isLayer1 !== destNetwork?.isLayer1) {
          setTx(txObj)
        }
        app?.txHistory?.addTransaction(
          txObj
        )
      }
    } catch (err) {
      if (!/cancelled/gi.test(err.message)) {
        setError(err.message)
      }
      logger.error(err)
    }

    setSending(false)
  }

  const enoughBalance = Number(sourceBalance) >= Number(sourceTokenAmount)
  const withinMax = true
  let sendButtonText = 'Convert'
  const validFormFields = !!(
    sourceTokenAmount &&
    destTokenAmount &&
    enoughBalance &&
    withinMax
  )
  if (sourceBalance === undefined) {
    sendButtonText = 'Fetching balance...'
  } else if (!enoughBalance) {
    sendButtonText = 'Insufficient funds'
  }

  return (
    <ConvertContext.Provider
      value={{
        convertOptions,
        convertOption,
        networks,
        l2Networks,
        selectedNetwork,
        setSelectedNetwork,
        sourceNetwork,
        destNetwork,
        sourceToken,
        destToken,
        sourceTokenAmount,
        setSourceTokenAmount,
        destTokenAmount,
        setDestTokenAmount,
        convertTokens,
        validFormFields,
        sending,
        sendButtonText,
        sourceBalance,
        loadingSourceBalance,
        destBalance,
        loadingDestBalance,
        switchDirection,
        error,
        setError,
        tx,
        setTx
      }}
    >
      {children}
    </ConvertContext.Provider>
  )
}

export const useConvert = () => useContext(ConvertContext)

export default ConvertContextProvider
