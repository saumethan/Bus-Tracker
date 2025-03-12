// Libraries
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Variables
const liveTimesUrl = "https://apim-public-trs.trapezegroupazure.co.uk/trs/lts/lts/v1/public/departures";
const liveTimesKey = "3918fe2ad7e84a6c8108b305612a8eb3";

// Routes
// Get all stops within given viewport coordinate bounds
router.get("/", async (req, res) => {
    // validate coordinates
    const { yMax, yMin, xMax, xMin } = req.query;
    if (!yMax || !yMin || !xMax || !xMin) {
        return res.status(400).json({ "error": "You must specify a valid yMax, yMin, xMax and xMin parameter." });
    }

    try {
        const url = `https://bustimes.org/stops.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;
        const response = await axios.get(url);

        if (response && response.data) {
            // parse the stop data into a better format
            const stopsData = response.data.features.map(stop => ({
                longitude: stop.geometry.coordinates[0],
                latitude: stop.geometry.coordinates[1],
                services: stop.properties.services,
                bustimes_id: stop.properties.url.split("/")[2],
                name: stop.properties.name
            }));
            
            return res.json(stopsData);
        }
    } catch (e) {
        console.error("Failed to fetch or parse stops data:", e.message);
        return res.status(501).json({ "error": e.message })
    }
});

// Fetch live times for buses at a given stop ID
router.get("/times", async (req, res) => {
    // validate stopId parameter
    const stopId = req.query.stopId;
    if (!stopId) {
        return res.status(400).json({ "error": "You must pass a valid stop ID to get times." });
    }

    try {
        
        const response = await axios.post(
            liveTimesUrl,
            {
                clientTimeZoneOffsetInMS: 0,
                departureDate: new Date().toISOString(),
                departureTime: new Date().toISOString(),
                stopIds: [ stopId ],
                stopType: "BUS_STOP",
                requestTime: new Date().toISOString(),
                departureOrArrival: "DEPARTURE",
                refresh: false,
                source: "WEB"
            },
            {
                headers: { "ocp-apim-subscription-key": liveTimesKey } 
            }
        );
        
        if (response && response.data) {
            return res.json(response.data);
        }
    } catch (e) {
        console.error(`Failed to fetch live times for stop ${req.query.stopId}:`, e);
        return res.status(500).json({ "error": e.message });
    }
});

// Exports
module.exports = router;