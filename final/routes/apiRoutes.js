// apiRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// SERVER ENDPOINT: Get specific bus route data
router.get("/buses/:noc/:route", async (req, res) => {
    try {
        const { noc, route } = req.params;

        // Corrected API URL
        const url = `https://bustimes.org/vehicles.json?operator=${noc}`;

        // Fetch data using axios
        const response = await axios.get(url);

        const busData = [];
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(bus => {
                // Validate route match first
                if (!bus.service?.line_name || bus.service.line_name !== route) return;
                
                // Validate coordinates
                if (!bus.coordinates || !Array.isArray(bus.coordinates)) return;
                const [longitude, latitude] = bus.coordinates;
                
                busData.push({
                    longitude: longitude,
                    latitude: latitude,
                    route: bus.service.line_name,
                    destination: bus.destination,
                    tripId: bus.trip_id,
                    serviceId: bus.service_id,
                    noc: bus.vehicle.url.split("/")[2].split("-")[0].toUpperCase()
                });
            });
        }

        res.json(busData); 
    } catch (error) {
        console.error("Error fetching specific bus data:", error);
        res.status(500).json({ error: "Failed to fetch specific bus data" });
    }
});

module.exports = router;
