const express = require("express");
const axios = require("axios");
const router = express.Router();



router.get("/", async (req, res) => {
    // validate coordinates
    const { startY, startX, endY, endX } = req.query;
    if (!startY || !startX || !endY || !endX) {
        return res.status(400).json({ "error": "You must specify a valid start and end coordinate" });
    }

    try {
        const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=5b3ce3597851110001cf6248a3172034c2b14968b43d2cd700121e72&start=${startY},${startX}&end=${endY},${endX}`;
        const response = await axios.get(url);
        if (response && response.data) {
            const geoJson = response.data;
            
            if (!geoJson.features || geoJson.features.length === 0) {
                return res.status(400).json({ error: "No route data found" });
            }

            const feature = geoJson.features[0];

            const routeData = {
                coordinates: feature.geometry.coordinates.map(coord => ({
                    longitude: coord[0],
                    latitude: coord[1]
                })),
                totalDistance: feature.properties.summary.distance,
                totalDuration: feature.properties.summary.duration
            };

            return res.json(routeData);
        }
        
    } catch (e) {
        console.error("Failed to fetch or parse route data:", e.message);
        return res.status(500).json({ "error": e.message })
    }
});

module.exports = router;