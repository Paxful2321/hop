import { actionHandler, parseBool, parseString, root } from './shared'
import {
  getSettleBondedWithdrawalsWatcher
} from 'src/watchers/watchers'

root
  .command('settle')
  .description('Settle bonded withdrawals')
  .option('--source-chain <slug>', 'Source chain', parseString)
  .option('--token <slug>', 'Token', parseString)
  .option('--transfer-root-hash <id>', 'Transfer root hash', parseString)
  .option('--transfer-id <id>', 'Transfer ID', parseString)
  .option('--bonder <address>', 'Bonder address', parseString)
  .option(
    '--dry [boolean]',
    'Start in dry mode. If enabled, no transactions will be sent.',
    parseBool
  )
  .action(actionHandler(main))

async function main (source: any) {
  const { sourceChain: chain, token, transferRootHash, transferId, bonder, dry: dryMode } = source
  if (!chain) {
    throw new Error('source chain is required')
  }
  if (!token) {
    throw new Error('token is required')
  }
  if (!(transferRootHash || transferId)) {
    throw new Error('transferRootHash or transferId is required')
  }

  const watcher = await getSettleBondedWithdrawalsWatcher({ chain, token, dryMode })
  if (!watcher) {
    throw new Error('watcher not found')
  }

  if (transferRootHash) {
    await watcher.checkTransferRootHash(transferRootHash, bonder)
  } else {
    await watcher.checkTransferId(transferId)
  }
}
