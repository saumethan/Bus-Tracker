const express = require("express");
const axios = require("axios");
const router = express.Router();

// SERVER ENDPOINT: Get all buses in viewport
router.get("/buses", async (req, res) => {
    try {
        const { yMax, xMax, yMin, xMin } = req.query;

        // API URL
        const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;

        // Fetch data using axios
        const response = await axios.get(url);
        
        // Process and validate data server-side
        const busData = [];
        if (response.data) {
            response.data.forEach(bus => {
                if (!bus.coordinates || !Array.isArray(bus.coordinates)) return;
                const [longitude, latitude] = bus.coordinates;
                
                // Validate coordinate ranges
                if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
                
                busData.push({
                    longitude: longitude,
                    latitude: latitude,
                    route: bus.service?.line_name,
                    destination: bus.destination,
                    tripId: bus.trip_id,
                    serviceId: bus.service_id,
                    noc: bus.vehicle?.url ? bus.vehicle.url.split("/")[2].split("-")[0].toUpperCase() : null
                });
            });
        }
        
        res.json(busData);
    } catch (error) {
        console.error("Error fetching bus data:", error);
        res.status(500).json({ error: "Failed to fetch bus data" });
    }
});

// SERVER ENDPOINT: Get specific bus route data
router.get("/buses/:noc/:route", async (req, res) => {
    try {
        const { noc, route } = req.params;

        // API URL
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

// SERVER ENDPOINT: Get specific bus route data
router.get("/buses/:route", async (req, res) => {
    try {
        const { route } = req.params;
        const { lat, lon, radius = 50 } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: "Missing lat/lon parameters" });
        }

        // Convert to numbers
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        const radiusValue = parseFloat(radius);

        if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusValue)) {
            return res.status(400).json({ error: "Invalid lat/lon values" });
        }

        // Calculate bounds
        const LATITUDE_DIFFERENCE = 0.0025;
        const LONGITUDE_DIFFERENCE = 0.0035;
        
        let yMax = latitude + (LATITUDE_DIFFERENCE * radiusValue);
        let yMin = latitude - (LATITUDE_DIFFERENCE * radiusValue);
        let xMax = longitude + (LONGITUDE_DIFFERENCE * radiusValue);
        let xMin = longitude - (LONGITUDE_DIFFERENCE * radiusValue);

        // Validate bounds
        yMax = Math.min(yMax, 90);
        yMin = Math.max(yMin, -90);
        xMax = Math.min(xMax, 180);
        xMin = Math.max(xMin, -180);

        const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;
        
        // Get all buses in the area
        const response = await axios.get(url);
        
        // Filter for the requested service
        const filteredBuses = response.data
            .filter(bus => bus.service?.line_name === route && bus.coordinates)
            .map(bus => ({
                longitude: bus.coordinates[0],
                latitude: bus.coordinates[1],
                route: bus.service.line_name,
                destination: bus.destination,
                tripId: bus.trip_id,
                serviceId: bus.service_id,
                noc: bus.vehicle?.url?.split("/")[2].split("-")[0].toUpperCase() || null
            }));

        res.json(filteredBuses);
    } catch (error) {
        console.error("Error finding buses:", error);
        res.status(500).json({ error: "Failed to find buses" });
    }
});


module.exports = router;
