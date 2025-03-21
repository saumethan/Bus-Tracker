// busRoutesApi.js

const express = require("express");
const axios = require("axios");
const router = express.Router();
const WebSocket = require("ws");

// Socket for each area
let northAberdeenSocket = null;
let southAberdeenSocket = null;
let westGlasgowSocket = null;
let southEastGlasgowSocket = null;
let northEastGlasgowSocket = null;

// Bus data for each area
let northAberdeenBusData = [];
let southAberdeenBusData = [];
let westGlasgowBusData = [];
let southEastGlasgowBusData = [];
let northEastGlasgowBusData = [];

const coordinates = {
    northAberdeen: { yMax: 57.24422955360555, xMax: -2.0628219299328237, yMin: 57.14788280852653, xMin: -2.3668146078098857 },
    southAberdeen: { yMax: 57.14781685973591, xMax: -2.0527877170343345, yMin: 57.075778570610254, xMin: -2.3342530891815727 },
    westGlasgow: { yMax: 56.044513549415285, xMax: -4.289896864619664, yMin: 55.68620558451926, xMin: -4.746236719602905 },
    southEastGlasgow: { yMax: 55.86261496560846, xMax: -3.675846161883726, yMin: 55.67619459865884, xMin: -4.289682229198604 },
    NorthEastGlasgow: { yMax: 56.05204516215275, xMax: -3.818773575817602, yMin: 55.86265643719699, xMin: -4.289794507412324 }
};


// SERVER ENDPOINT: Starts the First Bus websocket
router.get("/startWebsocket", async (req, res) => {
    await getFirstBusLocation();
    res.json({ message: "WebSocket started" });
});

// SERVER ENDPOINT: Get all buses in viewport
router.get("/", async (req, res) => {

    const minX = req.query.xMin 
    const minY = req.query.yMin
    const maxX = req.query.xMax 
    const maxY = req.query.yMax 

    try {
        // API URL
        const url = `https://bustimes.org/vehicles.json?ymax=${maxY}&xmax=${maxX}&ymin=${minY}&xmin=${minX}`;

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
        const mergedBusData = [...busData, ...northAberdeenBusData, ...southAberdeenBusData, ...westGlasgowBusData, ...southEastGlasgowBusData, ...northEastGlasgowBusData];
        return res.json(mergedBusData);
    } catch (error) {
        if(error.response && error.response.status === 404){
            const mergedBusData = [...northAberdeenBusData, ...southAberdeenBusData, ...westGlasgowBusData, ...southEastGlasgowBusData, ...northEastGlasgowBusData];
            return res.json(mergedBusData);
        }
        console.error("Error fetching bus data:", error);
        return res.status(500).json({ error: "Failed to fetch bus data" });
    }
});

// SERVER ENDPOINT: Search and get specific bus GPS data 
router.get("/find/:route", async (req, res) => {
    try {
        const { route } = req.params;
        const lat = req.query.lat || null;
        const lng = req.query.lon || null;
        let yMax = req.query.maxY || null; 
        let xMax = req.query.maxX || null; 
        let yMin = req.query.minY || null; 
        let xMin = req.query.minX || null; 
        const radius = 50;


        // Calculate bounds based on the radius
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const radiusValue = parseFloat(radius);

            const LATITUDE_DIFFERENCE = 0.0025;
            const LONGITUDE_DIFFERENCE = 0.0035;
            
            let calculatedYMax = latitude + (LATITUDE_DIFFERENCE * radiusValue);
            let calculatedYMin = latitude - (LATITUDE_DIFFERENCE * radiusValue);
            let calculatedXMax = longitude + (LONGITUDE_DIFFERENCE * radiusValue);
            let calculatedXMin = longitude - (LONGITUDE_DIFFERENCE * radiusValue);

            // Validate bounds
            calculatedYMax = Math.min(calculatedYMax, 90);
            calculatedYMin = Math.max(calculatedYMin, -90);
            calculatedXMax = Math.min(calculatedXMax, 180);
            calculatedXMin = Math.max(calculatedXMin, -180);

            yMax = calculatedYMax;
            yMin = calculatedYMin;
            xMax = calculatedXMax;
            xMin = calculatedXMin;
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

async function getFirstBusLocation() {
    // Initialise sockets if not connected
    if (!northAberdeenSocket || northAberdeenSocket.readyState !== WebSocket.OPEN ||
        !southAberdeenSocket || southAberdeenSocket.readyState !== WebSocket.OPEN ||
        !westGlasgowSocket || westGlasgowSocket.readyState !== WebSocket.OPEN ||
        !southEastGlasgowSocket || southEastGlasgowSocket.readyState !== WebSocket.OPEN ||
        !northEastGlasgowSocket || northEastGlasgowSocket.readyState !== WebSocket.OPEN) {
        
        const token = await getSocketToken();
        if (token) {
            try {
                await Promise.all([
                    startSocket("northAberdeen", token),
                    startSocket("southAberdeen", token),
                    startSocket("westGlasgow", token),
                    startSocket("southEastGlasgow", token),
                    startSocket("northEastGlasgow", token)
                ]);
                console.log("All sockets initialized successfully");
            } catch (error) {
                console.error("Error initializing sockets:", error);
                return false;   
            }
        } else {
            console.error("Failed to get socket token");
            return null;
        }
    }

    try {
        // Send messages to configure each socket        }
        await Promise.all([
            sendSocketMessage("northAberdeen", coordinates.northAberdeen),
            sendSocketMessage("southAberdeen", coordinates.southAberdeen),
            sendSocketMessage("westGlasgow", coordinates.westGlasgow),
            sendSocketMessage("southEastGlasgow", coordinates.southEastGlasgow),
            sendSocketMessage("northEastGlasgow", coordinates.northEastGlasgow)
        ]);
        return true;
    } catch (error) {
        console.error("Error getting bus locations:", error);
        return null;
    }
}

async function getSocketToken() {
    const url = "https://dev.mobileapi.firstbus.co.uk/api/v1/bus/service/socketInfo";
    try {
        const response = await axios.get(url, {
            headers: {
                "x-app-key": "b05fbe23a091533ea3efbc28321f96a1cf3448c1",
                "accept": "text/plain"
            }
        });
        
        let token = null;
        if (response.status === 200 && response.data && response.data.data) {
            token = response.data.data["access-token"];
        }

        return token;
    } catch (error) {
        console.error("Error getting socket token:", error);
        return null;
    }
}

function startSocket(area, token) {
    return new Promise((resolve, reject) => {
        // Get the right socket reference
        let socketRef;
        if (area === "northAberdeen") {
            // Close existing socket if open
            if (northAberdeenSocket && northAberdeenSocket.readyState === WebSocket.OPEN) {
                northAberdeenSocket.close();
            }
            // Create new socket connection
            northAberdeenSocket = new WebSocket("wss://streaming.bus.first.transportapi.com/", {
                headers: { Authorization: "Bearer " + token }
            });
            socketRef = northAberdeenSocket;
        } else if (area === "southAberdeen") {
            // Close existing socket if open
            if (southAberdeenSocket && southAberdeenSocket.readyState === WebSocket.OPEN) {
                southAberdeenSocket.close();
            }
            // Create new socket connection
            southAberdeenSocket = new WebSocket("wss://streaming.bus.first.transportapi.com/", {
                headers: { Authorization: "Bearer " + token }
            });
            socketRef = southAberdeenSocket;
        } else if (area === "westGlasgow") {
            // Close existing socket if open
            if (westGlasgowSocket && westGlasgowSocket.readyState === WebSocket.OPEN) {
                westGlasgowSocket.close();
            }
            // Create new socket connection
            westGlasgowSocket = new WebSocket("wss://streaming.bus.first.transportapi.com/", {
                headers: { Authorization: "Bearer " + token }
            });
            socketRef = westGlasgowSocket;
        } else if (area === "southEastGlasgow") {
            // Close existing socket if open
            if (southEastGlasgowSocket && southEastGlasgowSocket.readyState === WebSocket.OPEN) {
                southEastGlasgowSocket.close();
            }
            // Create new socket connection
            southEastGlasgowSocket = new WebSocket("wss://streaming.bus.first.transportapi.com/", {
                headers: { Authorization: "Bearer " + token }
            });
            socketRef = southEastGlasgowSocket;
        } else {
            // Close existing socket if open
            if (northEastGlasgowSocket && northEastGlasgowSocket.readyState === WebSocket.OPEN) {
                northEastGlasgowSocket.close();
            }
            // Create new socket connection
            northEastGlasgowSocket = new WebSocket("wss://streaming.bus.first.transportapi.com/", {
                headers: { Authorization: "Bearer " + token }
            });
            socketRef = northEastGlasgowSocket;
        }

        socketRef.on("open", () => {
            console.log(`Connected to First Bus Web Socket for ${area}`);
            resolve();
        });

        socketRef.on("message", (data) => {
            console.log(`RAW MESSAGE FROM ${area}:`, data.toString().substring(0, 200) + "...");
            try {
                const message = JSON.parse(data.toString());
                if (message && message.params && message.params.resource && message.params.resource.member) {
                    const buses = message.params.resource.member.map(bus => ({
                        journeyId: null,
                        longitude: bus.status.location.coordinates[0],
                        latitude: bus.status.location.coordinates[1],
                        heading: bus.status.bearing,
                        route: bus.line_name,
                        destination: null,
                        noc: bus.operator || null
                    }));

                    if (area === "northAberdeen") {
                        northAberdeenBusData = buses;
                        console.log(`Updated North Aberdeen bus data: ${buses.length} buses`);
                    } else if (area === "southAberdeen") {
                        southAberdeenBusData = buses;
                        console.log(`Updated South Aberdeen bus data: ${buses.length} buses`);
                    } else if (area === "westGlasgow") {
                        westGlasgowBusData = buses;
                        console.log(`Updated West Glasgow bus data: ${buses.length} buses`);
                    } else if (area === "southEastGlasgow") {
                        southEastGlasgowBusData = buses;
                        console.log(`Updated South East Glasgow bus data: ${buses.length} buses`);
                    } else if (area === "NorthEastGlasgow") {
                        northEastGlasgowBusData = buses;
                        console.log(`Updated North East Glasgow bus data: ${buses.length} buses`);
                    } else {
                        console.warn(`Unknown area: ${area}`);
                        return;
                    }

                    const totalBuses = northAberdeenBusData.length + southAberdeenBusData.length + westGlasgowBusData.length + southEastGlasgowBusData.length + northEastGlasgowBusData.length;
                    console.log(`Total buses across all areas: ${totalBuses} na: ${northAberdeenBusData.length}, sa: ${southAberdeenBusData.length}, wg: ${westGlasgowBusData.length}, seg: ${southEastGlasgowBusData.length}, neg: ${northEastGlasgowBusData.length}`);
                }
            } catch (error) {
                console.error(`Error processing ${area} socket message:`, error);
            }
        });

        socketRef.on("error", (err) => {
            console.error(`Failed to connect to ${area} First Bus Web Socket:`, err);
            reject(err);
        });
        
        socketRef.on("close", () => {
            console.log(`${area} socket connection closed`);
            if (area === "northAberdeen") {
                northAberdeenSocket = null;
            } else if (area === "southAberdeen") {
                southAberdeenSocket = null;
            } else if (area === "westGlasgow") {
                westGlasgowSocket = null;
            } else if (area === "southEastGlasgow") {
                southEastGlasgowSocket = null;
            } else if (area === "NorthEastGlasgow") {
                northEastGlasgowSocket = null;
            } else {
                console.warn(`Unknown area: ${area}`);
            }
        });
        
        // Add timeout 
        setTimeout(() => {
            if (socketRef.readyState !== WebSocket.OPEN) {
                reject(new Error(`${area} socket connection timeout`));
            }
        }, 10000);
    });
}

async function sendSocketMessage(area, coords) {
    let socketRef;
    if (area === "northAberdeen") {
        socketRef = northAberdeenSocket;
    } else if (area === "southAberdeen") {
        socketRef = southAberdeenSocket;
    } else if (area === "westGlasgow") {
        socketRef = westGlasgowSocket;
    } else if (area === "southEastGlasgow") {
        socketRef = southEastGlasgowSocket;
    } else if (area === "NorthEastGlasgow") {
        socketRef = northEastGlasgowSocket;
    } else {
        console.warn(`Unknown area: ${area}`);
        socketRef = null;
    }

    // Ensure socket is ready
    if (!socketRef || socketRef.readyState !== WebSocket.OPEN) {
        console.log(`${area} socket not ready, attempting to reconnect`);
        const token = await getSocketToken();
        if (token) {
            await startSocket(area, token);
            // Update socket reference after reconnection
            if (area === "northAberdeen") {
                socketRef = northAberdeenSocket;
            } else if (area === "southAberdeen") {
                socketRef = southAberdeenSocket;
            } else if (area === "westGlasgow") {
                socketRef = westGlasgowSocket;
            } else if (area === "southEastGlasgow") {
                socketRef = southEastGlasgowSocket;
            } else if (area === "NorthEastGlasgow") {
                socketRef = northEastGlasgowSocket;
            } else {
                console.warn(`Unknown area: ${area}`);
                socketRef = null;
            }
        } else {
            throw new Error(`Could not get socket token for ${area}`);
        }
    }

    const { yMax, xMax, yMin, xMin } = coords;
    const message = JSON.stringify({
        "jsonrpc": "2.0",
        "id": "4b9444d9-ffcb-4f22-b36d-14deff240a65",
        "method": "configuration",
        "params": {
            "min_lon": parseFloat(parseFloat(xMin).toFixed(4)),
            "max_lon": parseFloat(parseFloat(xMax).toFixed(4)),
            "min_lat": parseFloat(parseFloat(yMin).toFixed(4)),
            "max_lat": parseFloat(parseFloat(yMax).toFixed(4))
        }
    });

    return new Promise((resolve, reject) => {
        socketRef.send(message);
        console.log(`Sent configuration message to ${area} socket`);
        
        const timeout = setTimeout(() => reject(new Error(`${area} response timeout`)), 5000);
        
        const messageHandler = (data) => {
            try {
                const response = JSON.parse(data.toString());
                
                if (response.result && Object.keys(response.result).length === 0) {
                    console.log(`Received empty acknowledgment from ${area}, waiting for data...`);
                    return; 
                }
                
                clearTimeout(timeout);
                socketRef.removeListener("message", messageHandler);
                resolve(response);
            } catch (error) {
                console.error(`Error parsing ${area} socket message:`, error);
            }
        };
        
        socketRef.on("message", messageHandler);
        
        setTimeout(() => {
            socketRef.removeListener("message", messageHandler);
            resolve({"jsonrpc": "2.0", "result": `timeout waiting for ${area} data`});
        }, 5000);
    });
}

module.exports = router;
