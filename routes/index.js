const url = require('url')
const express = require('express')
const router = express.Router()
const needle = require('needle')
const apicache = require('apicache')

const MAX_RUN_TIME = 15

let priceCachePerPending = {}
let assetIdsPerPlayer = {}
let runTimePerPlayer = {}

let interval = null
let isProcessing = false

async function handlePending(playerName, assetId) {
    runTimePerPlayer[playerName] += 1;

    if (runTimePerPlayer[playerName] == MAX_RUN_TIME) {
        delete priceCachePerPending[playerName];
        delete runTimePerPlayer[playerName];

        return;
    }

    try {
        const URL = `${API_BASE_URL}v2/assets/${assetId}/details`;

        const apiRes = await needle('get', URL);
        const data = apiRes.body;
        const priceInRobux = data.PriceInRobux;

        if (priceCachePerPending[playerName]) {
            priceCachePerPending[playerName].push(priceInRobux);
        }
    } catch (err) {
        console.error(`Error fetching data for player ${playerName} and asset ${assetId}:`, err);
    }
}

function startPending() {
    if (isProcessing) {
        return
    }

    isProcessing = true

    let playerKeys = Object.keys(priceCachePerPending)
    for (const playerName of playerKeys) {
        try {
            await handlePending(playerName, assetIdsPerPlayer[playerName]);
        } catch (err) {
            console.error(`Error in handlePending for player ${playerName}:`, err);
        }
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
            interval = setInterval(() => {
                if (Object.keys(priceCachePerPending).length <= 0) {
                  clearInterval(interval)
                  interval = null
                } else {
                  startPending()
                }
              }, 1000)
        }

        if (!priceCachePerPending[playerName]) {
            priceCachePerPending[playerName] = []
            assetIdsPerPlayer[playerName] = assetId
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
    next(error)
  }
})

module.exports = router
