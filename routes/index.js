const url = require('url')
const express = require('express')
const router = express.Router()
const needle = require('needle')
const apicache = require('apicache')

const MAX_RUN_TIME = 15

let priceCachePerPending = {}
let assetIdsPerPlayer = {}
let intervals = {}
let runTimePerPlayer = {}

let interval = null
let isProcessing = false

async function handlePending(playerName, assetId) {
    console.log(priceCachePerPending[playerName])

        runTimePerPlayer[playerName] += 1

        if (runTime[playerName] == MAX_RUN_TIME) {
            delete intervals[playerName]
            delete priceCachePerPending[playerName]
            delete runTime[playerName]

            return
        }

        const URL = `${API_BASE_URL}v2/assets/${assetIdsPerPlayer[playerName]}/details`

        const apiRes = await needle('get', URL)
        const data = apiRes.body
        const priceInRobux = data.PriceInRobux

        console.log(`priceInRobux:  ${priceInRobux}`)

        if (priceCachePerPending[playerName]) {
            priceCachePerPending[playerName].push(priceInRobux)
        } else {
            console.log('startPending:  price cache for player has been deleted.')
        }
}

function startPending() {

    if (Object.keys(priceCachePerPending).length <= 0) {
        clearInterval(interval)

        return
    }

    if (isProcessing) {
        return
    }

    isProcessing = true

    for (const playerName of priceCachePerPending) {
        handlePending(playerName, assetIdsPerPlayer[playerName])
    }

    isProcessing = false
}

const API_BASE_URL = process.env.API_BASE_URL

// let cache = apicache.middleware

router.get('/', (req, res, next) => {
  try {
    const query = url.parse(req.url, true).query;
    const playerName = query.playerName;
    const assetId = query.assetId;
    const isPending = query.isPending;

    if (isPending == 'true') {

        if (!interval) {
            interval = setInterval(startPending, 1000)
        }

        if (!priceCachePerPending[playerName]) {
            priceCachePerPending[playerName] = []

            assetIdsPerPlayer[playerName] = assetId
        }

        if (!runTimePerPlayer[playerName]) {
            runTimePerPlayer[playerName] = 0
        }

        res.status(200).json({ message: 'have started cache collection for pending' })
    } else if (isPending == 'false') {

        delete runTimePerPlayer[playerName]
        delete assetIdsPerPlayer[playerName]

        let cacheCopy = priceCachePerPending[playerName].slice()
        delete priceCachePerPending[playerName]

        if (cacheCopy != null) {
            res.status(200).json({ cacheCopy: cacheCopy, playerName: playerName })
        } else {
            res.status(200).json({ message: 'you don not have any cache' })
        }
    }

  } catch (error) {
    console.log(error)

    next(error)
  }
})

module.exports = router