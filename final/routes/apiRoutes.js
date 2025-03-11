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

// SERVER ENDPOINT: Get specific bus GPS data
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

// SERVER ENDPOINT: Search and get specific bus GPS data 
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

// SERVER ENDPOINT: Get bus route data
router.get("/routes", async (req, res) => {
    let { serviceId, tripId } = req.query;
    let routeCoords = [];
    let routeNumber = "";
    let destination = "";

    try {
        // Fetch tripId if it's undefined
        if (!tripId) {
            const url1 = `https://bustimes.org/vehicles.json?service=${serviceId}`;
            const response1 = await axios.get(url1);

            if (!response1.data || response1.data.length === 0 || !response1.data[0].trip_id) {
                return res.status(404).json({ error: "No trip ID found" });
            }

            tripId = response1.data[0].trip_id;
        }

        // Ensure tripId is valid
        if (!tripId) {
            return res.status(400).json({ error: "Invalid trip ID" });
        }

        // Fetch route details
        const url2 = `https://bustimes.org/api/trips/${tripId}/?format=json`;
        const response2 = await axios.get(url2);

        if (!response2.data.times || response2.data.times.length === 0) {
            return res.status(404).json({ error: "No route data found" });
        }

        // Extract route number
        routeNumber = response2.data.service?.line_name || "Unknown Route";

        // Extract route coordinates and destination
        response2.data.times.forEach((stop, index) => {
            if (stop.track && Array.isArray(stop.track)) {
                stop.track.forEach(coord => {
                    if (Array.isArray(coord) && coord.length === 2) {
                        routeCoords.push([coord[1], coord[0]]); // Reverse order to [lat, lon]
                    }
                });
            }
            if (stop.stop?.location && Array.isArray(stop.stop.location) && stop.stop.location.length === 2) {
                routeCoords.push([stop.stop.location[1], stop.stop.location[0]]);
            }

            // Set last stop as the destination
            if (index === response2.data.times.length - 1) {
                destination = stop.stop?.name || "Unknown Destination";
            }
        });

        // Validate route coordinates
        if (routeCoords.length === 0) {
            return res.status(400).json({ error: "Invalid route coordinates", routeCoords: [], routeNumber, destination });
        }

        res.json({ routeCoords, routeNumber, destination });
    } catch (error) {
        console.error("Error fetching bus route:", error.message);
        res.status(500).json({ error: "Error fetching bus route" });
    }
});


module.exports = router;
