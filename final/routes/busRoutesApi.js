// busRoutesApi.js

const express = require("express");
const axios = require("axios");
const router = express.Router();

// SERVER ENDPOINT: Get all buses in viewport
router.get("/", async (req, res) => {
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
                    journeyId: bus.journey_id || null,
                    longitude: longitude,
                    latitude: latitude,
                    heading: bus.heading,
                    route: bus.service?.line_name,
                    destination: bus.destination,
                    tripId: bus.trip_id,
                    serviceId: bus.service_id,
                    noc: bus.vehicle?.url ? bus.vehicle.url.split("/")[2].split("-")[0].toUpperCase() : null
                });
            });
        }
        
        return res.json(busData);
    } catch (error) {
        if(error.response && error.response.status === 404){
            return res.json([]);
        }
        console.error("Error fetching bus data:", error);
        return res.status(500).json({ error: "Failed to fetch bus data" });
    }
});

// SERVER ENDPOINT: Search and get specific bus GPS data 
router.get("/find/:route", async (req, res) => {
    try {
        const { route } = req.params;
        const { lat, lng, minX, minY, maxX, maxY } = req.query;
        const radius = 50;

        if (!(lat && lng) || !(minX && minY && maxX && maxY)) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        if (lat && lng) {
            // Convert to numbers
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const radiusValue = parseFloat(radius);
    
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
        }

        const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;
        // Get all buses in the area
        const response = await axios.get(url);
        // Filter for the requested service
        const filteredBuses = response.data
            .filter(bus => bus.service?.line_name === route && bus.coordinates)
            .map(bus => ({
                journeyId: bus.journey_id || null,
                longitude: bus.coordinates[0],
                latitude: bus.coordinates[1],
                heading: bus.heading,
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

// SERVER ENDPOINT: Get specific bus GPS data
router.get("/:noc/:route", async (req, res) => {
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
                    heading: bus.heading,
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

// SERVER ENDPOINT: Get bus route data
router.get("/routes", async (req, res) => {
    let { serviceId, tripId, journeyId, noc, route } = req.query;
    
    try {

        if (noc === "TRDU" || (noc === "FSCE" && route === 22)) {
            try {
                const url = `https://www.xploredundee.com/_ajax/lines/map/TRDU/${route}`;
                const response = await axios.get(url);
        
                const routeData = findLongestRoute(response, route);

                if (routeData) {
                    return res.json(routeData);  
                } else {
                    return res.status(404).json({ error: "No route data found." }); 
                }
        
            } catch (error) {
                console.error("Error:", error.message);
                return await fetchJourneyData(journeyId, res); // Fallback to journey data if URL 1 fails
            }
        }
        

        if (noc === "MBLB" || noc === "MCGL" || noc === "FSCE") {
            try {
                const url = `https://www.mcgillsscotlandeast.co.uk/_ajax/lines/map/MBLB/${route}`;
                const response = await axios.get(url);
        
                const routeData = findLongestRoute(response, route);

                if (routeData) {
                    return res.json(routeData);  
                } else {
                    return res.status(404).json({ error: "No route data found." }); 
                }
        
            } catch (error) {
                console.error("Error:", error.message);
                return await fetchJourneyData(journeyId, res); // Fallback to journey data if URL 1 fails
            }
        }
        
        // If only serviceId is provided, fetch the tripId first from URL 1
        if (!tripId && serviceId) {
            try {
                const url1 = `https://bustimes.org/vehicles.json?service=${serviceId}`;
                const response1 = await axios.get(url1);
                
                // If we got valid data with a trip_id, assign it to tripId
                if (response1.data && response1.data.length > 0 && response1.data[0].trip_id) {
                    tripId = response1.data[0].trip_id;
                } else {
                    // If no tripId found, fallback to journeyId (URL 3)
                    return await fetchJourneyData(journeyId, res);
                }
            } catch (error) {
                console.error("Error fetching trip ID from serviceId:", error.message);
                return await fetchJourneyData(journeyId, res); // Fallback to journey data if URL 1 fails
            }
        }

        // If we have both tripId and serviceId, proceed with URL 2
        if (tripId) {
            try {
                const url2 = `https://bustimes.org/api/trips/${tripId}/?format=json`;
                const response2 = await axios.get(url2);

                if (response2.data && response2.data.times && response2.data.times.length > 0) {
                    const routeCoords = [];
                    let routeNumber = response2.data.service?.line_name || "Unknown Route";
                    let destination = "";

                    response2.data.times.forEach((stop, index) => {
                        if (stop.track && Array.isArray(stop.track)) {
                            stop.track.forEach(coord => {
                                if (Array.isArray(coord) && coord.length === 2) {
                                    routeCoords.push([coord[1], coord[0]]);
                                }
                            });
                        }

                        // Add stop location to coordinates
                        if (stop.stop?.location && Array.isArray(stop.stop.location) && stop.stop.location.length === 2) {
                            routeCoords.push([stop.stop.location[1], stop.stop.location[0]]);
                        }

                        // Set last stop as the destination
                        if (index === response2.data.times.length - 1) {
                            destination = stop.stop?.name || "Unknown Destination";
                        }
                    });

                    if (routeCoords.length > 0) {
                        return res.json({ routeCoords, routeNumber, destination });
                    }
                }
            } catch (error) {
                console.error("Error fetching trip data from URL 2:", error.message);
            }
        }

        // If URL 2 fails or tripId is undefined, attempt to fetch journey data (URL 3)
        return await fetchJourneyData(journeyId, res);

    } catch (error) {
        console.error("Error in route handler:", error.message);
        return res.status(200).json({}); 
    }
});

async function fetchJourneyData(journeyId, res) {
    try {
        if (journeyId) {
            const url3 = `https://bustimes.org/journeys/${journeyId}.json`;
            const response3 = await axios.get(url3);

            if (response3.data && response3.data.locations) {
                const routeNumber = response3.data.route_name;
                const destination = response3.data.destination;

                const routeCoords = response3.data.locations.map(location => {
                    const [latitude, longitude] = location.coordinates;
                    return [longitude, latitude]; // Flip the coordinates
                });

                return res.json({ routeCoords, routeNumber, destination });
            }
        }
    } catch (error) {
        console.error("Error fetching journey data:", error.message);
    }

    // If no data from journey, return empty response
    return res.status(200).json({});
}

function findLongestRoute(response, route) {
    if (response.data) {
        const features = response.data.features;
        let featureWithMostCoords = null;
        let maxCoordsLength = 0;

        // Loop through each feature
        features.forEach(feature => {
            const coords = feature.geometry.coordinates;
            const coordsLength = coords.length;

            // Swap coordinates 
            const correctedCoords = coords.map(coord => [coord[1], coord[0]]);

            if (coordsLength > maxCoordsLength) {
                maxCoordsLength = coordsLength;
                featureWithMostCoords = { ...feature, geometry: { ...feature.geometry, coordinates: correctedCoords } };
            }
        });

        // Feature with most coordinates
        if (featureWithMostCoords) {
            const routeCoords = featureWithMostCoords.geometry.coordinates;
            const destination = "";  
            return { routeCoords, route, destination };
        } else {
            return null;  
        }
    }
    return null;  
}


module.exports = router;
