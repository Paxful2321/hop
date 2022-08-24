import React, { useMemo, useState, useEffect } from 'react'
import { useInterval } from 'react-use'
import { BigNumber, Contract } from 'ethers'
import Alert from 'src/components/alert/Alert'
import Box from '@material-ui/core/Box'
import Button from 'src/components/buttons/Button'
import Typography from '@material-ui/core/Typography'
import { useWeb3Context } from 'src/contexts/Web3Context'
import merkleRewardsAbi from 'src/abis/MerkleRewards.json'
import { ShardedMerkleTree } from './merkle'
import { networkIdToSlug } from 'src/utils/networks'
import { getProviderByNetworkName } from 'src/utils/getProvider'
import { toTokenDisplay } from 'src/utils'
import { formatError } from 'src/utils/format'
import useAsyncMemo from 'src/hooks/useAsyncMemo'
import erc20Abi from '@hop-protocol/core/abi/generated/ERC20.json'
import InfoTooltip from 'src/components/InfoTooltip'
import useQueryParams from 'src/hooks/useQueryParams'

interface Props {
  rewardsContractAddress: string
  merkleBaseUrl: string
  requiredChainId: number
  title: string
}

export function RewardsWidget(props: Props) {
  const { queryParams } = useQueryParams()
  const { rewardsContractAddress, merkleBaseUrl, requiredChainId, title } = props
  const { checkConnectedNetworkId, address, provider, connectedNetworkId } = useWeb3Context()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimableAmount, setClaimableAmount] = useState(BigNumber.from(0))
  const [unclaimableAmount, setUnclaimableAmount] = useState(BigNumber.from(0))
  const [entryTotal, setEntryTotal] = useState(BigNumber.from(0))
  const [onchainRoot, setOnchainRoot] = useState('')
  const [latestRoot, setLatestRoot] = useState('')
  const [tokenDecimals, setTokenDecimals] = useState<number|null>(null)
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [latestRootTotal, setLatestRootTotal] = useState(BigNumber.from(0))
  const claimRecipient = queryParams.address as string ?? address?.address
  const pollUnclaimableAmountFromBackend = false
  const contract = useMemo(() => {
    try {
      if (rewardsContractAddress) {
        let _provider: any = provider
        if (connectedNetworkId !== requiredChainId) {
          _provider = getProviderByNetworkName(networkIdToSlug(requiredChainId))
        }
        return new Contract(rewardsContractAddress, merkleRewardsAbi, _provider)
      }
    } catch (err) {
      console.error(err)
    }
  }, [provider, rewardsContractAddress])

  const token = useAsyncMemo(async () => {
    try {
      if (contract) {
        const tokenAddress = await contract.rewardsToken()
        return new Contract(tokenAddress, erc20Abi, contract.provider)
      }
    } catch (err) {
      console.error(err)
    }
  }, [contract])

  const getOnchainRoot = async () => {
    try {
      if (contract) {
        const root = await contract.merkleRoot()
        setOnchainRoot(root)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    async function update() {
      if (token) {
        setTokenDecimals(await token.decimals())
        setTokenSymbol(await token.symbol())
      }
    }

    update().catch(console.error)
  }, [token])

  useInterval(getOnchainRoot, 10 * 1000)

  useEffect(() => {
    getOnchainRoot().catch(console.error)
  }, [contract])

  useInterval(getOnchainRoot, 10 * 1000)

  const getLatestRoot = async () => {
    try {
      if (!merkleBaseUrl) {
        return
      }
      const url = `${merkleBaseUrl}/latest.json`
      const res = await fetch(url)
      const json = await res.json()
      setLatestRoot(json.root)
      const { root, total } = await ShardedMerkleTree.fetchRootFile(merkleBaseUrl, json.root)
      if (root === json.root) {
        setLatestRootTotal(total)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    getLatestRoot().catch(console.error)
  }, [contract, merkleBaseUrl])

  useInterval(getLatestRoot, 10 * 1000)

  const getClaimableAmount = async () => {
    try {
      if (!(
        onchainRoot &&
        contract &&
        merkleBaseUrl &&
        claimRecipient
      )) {
        setClaimableAmount(BigNumber.from(0))
        return
      }
      const isSet = !BigNumber.from(onchainRoot).eq(BigNumber.from(0))
      if (!isSet) {
        return
      }
      const shardedMerkleTree = await ShardedMerkleTree.fetchTree(merkleBaseUrl, onchainRoot)
      const [entry] = await shardedMerkleTree.getProof(claimRecipient)
      if (!entry) {
        setClaimableAmount(BigNumber.from(0))
        return
      }
      const total = BigNumber.from(entry.balance)
      const withdrawn = await contract.withdrawn(claimRecipient)
      const amount = total.sub(withdrawn)
      setClaimableAmount(amount)
      setEntryTotal(total)
    } catch (err) {
      console.error(err)
      setClaimableAmount(BigNumber.from(0))
    }
    setLoading(false)
  }

  useEffect(() => {
    getClaimableAmount().catch(console.error)
  }, [contract, claimRecipient, onchainRoot, merkleBaseUrl])

  useInterval(getClaimableAmount, 10 * 1000)

  const getUnclaimableAmountFromRepo = async () => {
    try {
      if (pollUnclaimableAmountFromBackend) {
        return
      }
      if (!(
        onchainRoot &&
        latestRoot &&
        contract &&
        merkleBaseUrl &&
        claimRecipient &&
        claimableAmount &&
        entryTotal
      )) {
        setUnclaimableAmount(BigNumber.from(0))
        return
      }
      if (latestRoot === onchainRoot) {
        setUnclaimableAmount(BigNumber.from(0))
        return
      }
      const shardedMerkleTree = await ShardedMerkleTree.fetchTree(merkleBaseUrl, latestRoot)
      const [entry] = await shardedMerkleTree.getProof(claimRecipient)
      if (!entry) {
        setUnclaimableAmount(BigNumber.from(0))
        return
      }
      const total = BigNumber.from(entry.balance)
      let amount = total.sub(entryTotal)
      if (amount.lt(0)) {
        amount = BigNumber.from(0)
      }
      setUnclaimableAmount(amount)
    } catch (err) {
      console.error(err)
      setUnclaimableAmount(BigNumber.from(0))
    }
  }

  useEffect(() => {
    getUnclaimableAmountFromRepo().catch(console.error)
  }, [onchainRoot, claimRecipient, latestRoot, merkleBaseUrl, claimableAmount, entryTotal])

  useInterval(getUnclaimableAmountFromRepo, 10 * 1000)

  const getUnclaimableAmountFromBackend = async () => {
    try {
      if (!pollUnclaimableAmountFromBackend) {
        return
      }
      const url = `https://hop-merkle-rewards-backend.hop.exchange/v1/rewards?address=${claimRecipient}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) {
        throw new Error(json.err)
      }
      if (json.data.rewards.balance) {
        setUnclaimableAmount(json.data.rewards.balance)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    getUnclaimableAmountFromBackend().catch(console.error)
  }, [getUnclaimableAmountFromBackend, claimRecipient])

  useInterval(getUnclaimableAmountFromBackend, 10 * 1000)

  async function claim() {
    try {
      setError('')
      if (!(
        contract &&
        provider &&
        address &&
        claimRecipient &&
        onchainRoot &&
        merkleBaseUrl
      )) {
        return
      }
      const isNetworkConnected = await checkConnectedNetworkId(requiredChainId)
      if (!isNetworkConnected) {
        return
      }
      const isSet = !BigNumber.from(onchainRoot).eq(BigNumber.from(0))
      if (!isSet) {
        return
      }

      setClaiming(true)
      const shardedMerkleTree = await ShardedMerkleTree.fetchTree(merkleBaseUrl, onchainRoot)
      const [entry, proof] = await shardedMerkleTree.getProof(claimRecipient)
      if (!entry) {
        throw new Error('no entry')
      }
      const totalAmount = BigNumber.from(entry.balance)
      const tx = await contract.connect(provider.getSigner()).claim(claimRecipient, totalAmount, proof)
      console.log(tx)
      await tx.wait()
    } catch (err: any) {
      console.error(err)
      setError(formatError(err))
    }
    setClaiming(false)
  }

  const claimableAmountDisplay = tokenDecimals ? toTokenDisplay(claimableAmount, tokenDecimals) : ''
  const unclaimableAmountDisplay = tokenDecimals ? toTokenDisplay(unclaimableAmount, tokenDecimals) : ''
  const latestRootTotalDisplay = tokenDecimals ? toTokenDisplay(latestRootTotal, tokenDecimals) : ''

  return (
    <Box maxWidth="500px" margin="0 auto" flexDirection="column" display="flex" justifyContent="center" textAlign="center">
      <Box mb={6}>
        <Typography variant="h4">Rewards</Typography>
      </Box>
      {!claimRecipient && (
        <Box mb={4} display="flex" flexDirection="column" justifyContent="center" textAlign="center">
          <Typography variant="body1">
            Please connect wallet
          </Typography>
        </Box>
      )}
      {!!claimRecipient && (
        <Box>
          <Box mb={2}>
            <Typography variant="h6">{title} <InfoTooltip title={<><div>Merkle rewards</div><div>published root: {onchainRoot}</div><div>Latest root: {latestRoot}</div><div>latest root total: {latestRootTotalDisplay}</div></>} /></Typography>
          </Box>
          {loading && (
            <Box mb={4} display="flex" flexDirection="column" justifyContent="center" textAlign="center">
              <Typography variant="body1">
                Loading...
              </Typography>
            </Box>
          )}
          <Box mb={4} display="flex" flexDirection="column" justifyContent="center" textAlign="center">
            <Typography variant="body1">
              Claimable: <strong>{claimableAmountDisplay} {tokenSymbol}</strong> <InfoTooltip title={'Tokens that can be claimed now'} />
            </Typography>
            <Typography variant="body1">
              Locked: {unclaimableAmountDisplay} {tokenSymbol} <InfoTooltip title={'Tokens that will be claimable once merkle root is published on-chain'} />
            </Typography>
          </Box>
          <Box mb={2}>
            <Button variant="contained" onClick={claim} loading={claiming} disabled={claiming || claimableAmount.eq(0)} highlighted={claimableAmount.gt(0)}>Claim Rewards</Button>
          </Box>
        </Box>
      )}
      {!!error && (
        <Box mt={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
    </Box>
  )
}
