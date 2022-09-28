import AprStats from './AprStats'
import VolumeStats from './VolumeStats'
import TvlStats from './TvlStats'
import BonderStats from './BonderStats'
import S3Upload from './S3Upload'
import wait from 'wait'

type Options = {
  apr?: boolean
  tvl?: boolean
  volume?: boolean
  bonder?: boolean
  bonderProfit?: boolean
  bonderFees?: boolean
  bonderTxFees?: boolean
  regenesis?: boolean
  days?: number
  offsetDays?: number
  bonderDays?: number
  bonderStartDate?: string
  bonderEndDate?: string
  bonderTokens?: string[]
  pollIntervalSeconds?: number
}

class Worker {
  aprStats: AprStats
  volumeStats: VolumeStats
  tvlStats: TvlStats
  bonderStats: BonderStats
  hosting = new S3Upload()
  pollIntervalMs: number = 60 * 60 * 1000
  apr: boolean = false
  tvl: boolean = false
  volume: boolean = false
  bonder: boolean = false

  constructor (options: Options = {}) {
    let {
      apr,
      tvl,
      volume,
      regenesis,
      days,
      offsetDays,
      bonder,
      bonderProfit,
      bonderFees,
      bonderTxFees,
      bonderDays,
      bonderStartDate,
      bonderEndDate,
      bonderTokens,
      pollIntervalSeconds
    } = options
    this.apr = apr
    this.tvl = tvl
    this.volume = volume
    if (pollIntervalSeconds) {
      this.pollIntervalMs = pollIntervalSeconds * 1000
    }

    if (bonder || bonderProfit || bonderFees || bonderTxFees) {
      this.bonder = true
    }
    this.aprStats = new AprStats()
    this.volumeStats = new VolumeStats({
      regenesis
    })
    this.tvlStats = new TvlStats({
      regenesis,
      days
    })
    this.bonderStats = new BonderStats({
      days: bonderDays,
      offsetDays: offsetDays,
      startDate: bonderStartDate,
      endDate: bonderEndDate,
      tokens: bonderTokens,
      trackBonderProfit: bonderProfit ?? bonder,
      trackBonderFees: bonderFees ?? bonder,
      trackBonderTxFees: bonderTxFees ?? bonder
    })
  }

  async start () {
    console.log('worker started')
    console.log(`polling every ${this.pollIntervalMs}ms`)
    const promises: Promise<any>[] = []
    if (this.apr) {
      promises.push(this.aprStatsPoll())
    }
    if (this.tvl) {
      promises.push(this.tvlStatsPoll())
    }
    if (this.volume) {
      promises.push(this.volumeStatsPoll())
    }
    if (this.bonder) {
      promises.push(this.bonderStatsPoll())
    }
    if (!promises.length) {
      throw new Error('at least one option is required')
    }
    await Promise.all(promises)
  }

  async volumeStatsPoll () {
    console.log('volumeStatsPoll started')
    while (true) {
      try {
        console.log('fetching volume stats')
        await this.volumeStats.trackDailyVolume()
        console.log('done tracking volume stats')
      } catch (err) {
        console.error(err)
      }
      await wait(this.pollIntervalMs)
    }
  }

  async tvlStatsPoll () {
    console.log('tvlStatsPoll started')
    while (true) {
      try {
        console.log('fetching tvl stats')
        await this.tvlStats.trackTvl()
        console.log('done tracking tvl stats')
      } catch (err) {
        console.error(err)
      }
      await wait(this.pollIntervalMs)
    }
  }

  async aprStatsPoll () {
    console.log('aprStatsPoll started')
    while (true) {
      try {
        console.log('fetching apr stats')
        const data = await this.aprStats.getAllAprs()
        await this.hosting.upload(data)
        console.log('done uploading apr stats')
      } catch (err) {
        console.error(err)
      }
      await wait(this.pollIntervalMs)
    }
  }

  async bonderStatsPoll () {
    console.log('bonderStatsPoll started')
    while (true) {
      try {
        console.log('fetching bonder stats')
        await this.bonderStats.run()
        console.log('done tracking bonder stats')
      } catch (err) {
        console.error(err)
      }
      await wait(this.pollIntervalMs)
    }
  }
}

export default Worker
