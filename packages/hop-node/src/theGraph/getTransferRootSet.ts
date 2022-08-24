import makeRequest from './makeRequest'
import { normalizeEntity } from './shared'

export default async function getTransferRootSet (
  chain: string,
  token: string,
  lastId: string = '0'
) {
  const query = `
    query TransferRootSet(${token ? '$token: String, ' : ''}$lastId: ID) {
      transferRootSets(
        where: {
          id_gt: $lastId
          ${token ? 'token: $token,' : ''}
        },
        orderBy: id,
        orderDirection: asc,
        first: 1000
      ) {
        id
        rootHash
        totalAmount
      }
    }
  `
  const jsonRes = await makeRequest(chain, query, {
    token,
    lastId
  })
  let transferRoot = jsonRes.transferRootSets.map((x: any) => normalizeEntity(x))

  const maxItemsLength = 1000
  if (transferRoot.length === maxItemsLength) {
    lastId = transferRoot[transferRoot.length - 1].id
    transferRoot = transferRoot.concat(await getTransferRootSet(
      chain,
      token,
      lastId
    ))
  }

  return transferRoot
}
