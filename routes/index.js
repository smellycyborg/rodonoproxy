const url = require('url')
const express = require('express')
const router = express.Router()
const needle = require('needle')
const apicache = require('apicache')

let priceCachePerPending = {}
let intervals = {}

async function startPending(playerName, assetId) {
    if (!priceCachePerPending[playerName]) {
        priceCachePerPending[playerName] = []
    }

    const URL = `${API_BASE_URL}${assetId}/details`

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

function stopPending(playerName) {
    if (priceCachePerPending[playerName]) {
        clearInterval(intervals[playerName])
        delete intervals[playerName]

        let cacheCopy = priceCachePerPending[playerName].slice()
        delete priceCachePerPending[playerName]

        return cacheCopy
    }

    return null
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

        if (!intervals[playerName]) {
            intervals[playerName] = setInterval(startPending, 1000, playerName, assetId)
        } else {
            console.log('player cannot double purchase.')
        }

        res.status(200).json({ message: 'have started cache collection for pending' })
    } else if (isPending == 'false') {
        let cacheCopy = stopPending(playerName)

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