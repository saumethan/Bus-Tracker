/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @author Xavier Flockton @XavierFlockton
 * @description All functionality relating to getting live location and route coordinates for buses.
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();
const WebSocket = require("ws");
const fs = require("fs");

const ROUTES_FILE = "routes.json";

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
    northEastGlasgow: { yMax: 56.05204516215275, xMax: -3.818773575817602, yMin: 55.86265643719699, xMin: -4.289794507412324 }
};

let monitoringActive = false;

// SERVER ENDPOINT: Starts the First Bus websocket
router.get("/startWebsocket", async (req, res) => {
    if (!monitoringActive) {
        monitoringActive = true;
        requestFirstBusLocations().catch(error => {
            console.error("Monitoring stopped due to error:", error);
            monitoringActive = false;
        });
        res.json({ message: "WebSocket monitoring started" });
    } else {
        res.json({ message: "WebSocket monitoring already running" });
    }
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
                    direction: null,
                    route: bus.service?.line_name,
                    destination: bus.destination,
                    tripId: bus.trip_id,
                    serviceId: bus.service_id,
                    noc: bus.vehicle?.url ? bus.vehicle.url.split("/")[2].split("-")[0].toUpperCase() : null
                });
            });
        }
        const mergedBusData = [...busData, ...getBusesInBounds(northAberdeenBusData, minX, minY, maxX, maxY), ...getBusesInBounds(southAberdeenBusData, minX, minY, maxX, maxY), ...getBusesInBounds(westGlasgowBusData, minX, minY, maxX, maxY), ...getBusesInBounds(southEastGlasgowBusData, minX, minY, maxX, maxY), ...getBusesInBounds(northEastGlasgowBusData, minX, minY, maxX, maxY)];
        return res.json(mergedBusData);
    } catch (error) {
        if(error.response && error.response.status === 404){
            const mergedBusData = [...getBusesInBounds(northAberdeenBusData, minX, minY, maxX, maxY), ...getBusesInBounds(southAberdeenBusData, minX, minY, maxX, maxY), ...getBusesInBounds(westGlasgowBusData, minX, minY, maxX, maxY), ...getBusesInBounds(southEastGlasgowBusData, minX, minY, maxX, maxY), ...getBusesInBounds(northEastGlasgowBusData, minX, minY, maxX, maxY)];
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
        
        let filteredBuses = [];

        try {
            const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;
            // Get all buses in the area
            const response = await axios.get(url);
            // Filter for the requested service
            response.data.forEach(bus => {
                if (bus.service?.line_name === route && bus.coordinates) {
                    const busData = {
                        journeyId: bus.journey_id || null,
                        longitude: bus.coordinates[0],
                        latitude: bus.coordinates[1],
                        heading: bus.heading,
                        direction: null,
                        route: bus.service.line_name,
                        destination: bus.destination,
                        tripId: bus.trip_id,
                        serviceId: bus.service_id,
                        noc: bus.vehicle?.url?.split("/")[2].split("-")[0].toUpperCase() || null
                    };
                    filteredBuses.push(busData);
                }
            });
        } catch {
            console.log("no route")
        }

        if (filteredBuses.length === 0) {
            const busData = [...getBusesInBounds(northAberdeenBusData, xMin, yMin, xMax, yMax), ...getBusesInBounds(southAberdeenBusData, xMin, yMin, xMax, yMax), ...getBusesInBounds(westGlasgowBusData, xMin, yMin, xMax, yMax), ...getBusesInBounds(southEastGlasgowBusData, xMin, yMin, xMax, yMax), ...getBusesInBounds(northEastGlasgowBusData, xMin, yMin, xMax, yMax)];
        
            busData.forEach(bus => {
                if (route === bus.route) {
                    filteredBuses.push(bus);
                }
            });
        }

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
                    direction: null,
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
    const serviceId = req.query.serviceId;  
    const tripId = req.query.tripId;  
    const journeyId = req.query.journeyId;  
    const noc = req.query.noc;  
    const routeNumber = req.query.route;  
    const direction = req.query.direction; 
    
    try {
        let url
    
        // McGill's bus routes
        if (noc === "TRDU" || (noc === "FSCE" && [22, 32, 33, 18].includes(routeNumber))) {
            url = `https://www.xploredundee.com/_ajax/lines/map/TRDU/${routeNumber}`;
        } else if (noc === "MBLB" || noc === "FSCE") {
            url = `https://www.mcgillsscotlandeast.co.uk/_ajax/lines/map/MBLB/${routeNumber}`;
        } else if (noc === "MCGL") {
            url = `https://www.mcgillsbuses.co.uk/_ajax/lines/map/McG/${routeNumber}`;
        }
        
        if (url) {
            try {
                const response = await axios.get(url);
                const routeData = findLongestRoute(response, routeNumber);
                
                if (routeData) {
                    return res.json(routeData);
                } else {
                    return res.status(404).json([]);
                }
            } catch (error) {
                console.error("Error fetching data:", error.message);
            }
        }

        // Lothian Buses
        if (noc === "LOTH") {
            url = `https://lothianapi.co.uk/routePatterns?route_name=${routeNumber}`
        }

        if (url) {
            try {
                const response = await axios.get(url);
                const routeCoords = [];
                let firstSetProcessed = false; 

                if (response.data.patterns) {
                    for (const pattern of response.data.patterns) {
                        if (pattern.stops && Array.isArray(pattern.stops)) {
                            if (!firstSetProcessed) {
                                pattern.stops.forEach((stop, index) => {
                                    if (stop.coordinate) {
                                        routeCoords.push([stop.coordinate.latitude, stop.coordinate.longitude]); 
                                    }
                                });
                                firstSetProcessed = true; 
                            }
                        }
                    }
                }
                return res.json({ routeCoords, routeNumber, destination: null });
            } catch (error) {
                console.error("Error fetching data:", error.message);
                res.status(500).json({ error: "Failed to fetch route data" });
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
                try {
                    // If URL 2 fails or tripId is undefined, attempt to fetch journey data (URL 3)
                    return await fetchJourneyData(journeyId, res);
                } catch (error) {
                    console.log(error);
                } // Fallback to journey data if URL 1 fails
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
                            destination = stop.stop?.name || null;
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

        try {
            const ROUTES_FILE = loadRoutes();
            const routeKey = `${routeNumber}_${noc}_${direction}`.replace(/[^a-zA-Z0-9_]/g, "");
        
            if (ROUTES_FILE[routeKey]) {
                return res.json({ 
                    routeCoords: ROUTES_FILE[routeKey], 
                    routeNumber: routeNumber, 
                    destination: null 
                });
            } else {
                console.log(`Route ${routeKey} not found in local file.`);
            }
        } catch (error) {
            console.log("Something went wrong", error);
        }

        try {
            // If URL 2 fails or tripId is undefined, attempt to fetch journey data (URL 3)
            return await fetchJourneyData(journeyId, res);
        } catch (error) {
            console.log(error);
        }
        

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

    return res.status(200).json({});
}

function findLongestRoute(response, routeNumber) {
    if (response.data) {
        const features = response.data.features;
        let featureWithMostCoords = null;
        let maxCoordsLength = 0;

        // Loops through each feature
        features.forEach(feature => {
            const coords = feature.geometry.coordinates;
            const coordsLength = coords.length;

            // Swaps coordinates 
            const correctedCoords = coords.map(coord => [coord[1], coord[0]]);

            if (coordsLength > maxCoordsLength) {
                maxCoordsLength = coordsLength;
                featureWithMostCoords = { ...feature, geometry: { ...feature.geometry, coordinates: correctedCoords } };
            }
        });

        // Feature with most coordinates
        if (featureWithMostCoords) {
            const routeCoords = featureWithMostCoords.geometry.coordinates;
            const destination = null;  
            return { routeCoords, routeNumber, destination };
        } else {
            return null;  
        }
    }
    return null;  
}

async function requestFirstBusLocations() {
    // Runs continuously
    while (true) {       
        await getFirstBusLocation();
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
    }
}

async function getFirstBusLocation() {
    // Define the areas
    const areas = ["northAberdeen", "southAberdeen", "westGlasgow", "southEastGlasgow", "northEastGlasgow"];
    
    try {
        // Gets socket token
        const token = await getSocketToken();
        if (!token) {
            console.error("Failed to get socket token");
            return null;
        }
        
        // Processes each area
        for (const area of areas) {           
            try {
                // Starts socket for this area
                const socket = await startSocket(area, token);
                
                // Sends configuration message
                await sendSocketMessage(area, coordinates[area], socket);
                
                // Closes the socket 
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.close();
                }
            } catch (error) {
                console.error(`Error processing ${area}:`, error);
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error in getFirstBusLocation:", error);
        return null;
    }
}

// Function to get the token for the First Bus socket
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

// Function to start the webnsocket
function startSocket(area, token) {
    return new Promise((resolve, reject) => {       
        // Creates a new socket connection
        const socket = new WebSocket("wss://streaming.bus.first.transportapi.com/", {
            headers: { Authorization: "Bearer " + token }
        });
        
        // Seta up socket event handler
        socket.on("open", () => {
            resolve(socket);
        });

        socket.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message && message.params && message.params.resource && message.params.resource.member) {
                    const buses = [];
                    message.params.resource.member.forEach(bus => {
                        const stops = bus.stops || [];
                        let destination;
                        if (stops.length > 0) {
                            const lastStop = stops[stops.length - 1];
                            if (lastStop.name) {
                                destination = lastStop.name;
                            }  else {
                                destination = "Unknown";
                            }
                        } else {
                            destination = "Unknown";
                        }

                        buses.push({
                            journeyId: null,
                            longitude: bus.status.location.coordinates[0],
                            latitude: bus.status.location.coordinates[1],
                            heading: bus.status.bearing,
                            direction: bus.dir,
                            route: bus.line_name,
                            destination: destination,
                            noc: bus.operator || null
                        });
                    });

                    // Update the bus data arrays
                    if (area === "northAberdeen") {
                        northAberdeenBusData = buses;
                    } else if (area === "southAberdeen") {
                        southAberdeenBusData = buses;
                    } else if (area === "westGlasgow") {
                        westGlasgowBusData = buses;
                    } else if (area === "southEastGlasgow") {
                        southEastGlasgowBusData = buses;
                    } else if (area === "northEastGlasgow") {
                        northEastGlasgowBusData = buses;
                    }

                    // put stops into stop data JSON (not currently used as all the routes have been added) 
                    // try {
                    //     if (message.method === "update" && message.params?.resource?.member) {
                    //         message.params.resource.member.forEach(bus => {
                    //             const lineName = bus.line_name;
                    //             const operator = bus.operator;
                    //             const direction = bus.dir;
                    //             const coordinates = bus.stops.map(stop => [stop.latitude, stop.longitude]);
                
                    //             addRoute(lineName, operator, direction, coordinates);
                    //         });
                    //     }
                    // } catch (error) {
                    //     console.error("Error processing message:", error);
                    // }
                }
            } catch (error) {
                console.error(`Error processing ${area} socket message:`, error);
            }
        });

        socket.on("error", (err) => {
            console.error(`Failed to connect to ${area} First Bus Web Socket:`, err);
            reject(err);
        });
        
        // socket.on("close", () => {
        //     console.log(`${area} socket connection closed`);
        // });
        
        // Timeout 
        setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
                reject(new Error(`${area} socket connection timeout`));
            }
        }, 10000);
    });
}
async function sendSocketMessage(area, coords, socket) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error(`Socket for ${area} is not open`);
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
        socket.send(message);
        
        // Timeout 
        const timeout = setTimeout(() => {
            resolve({"status": "timeout"});
        }, 5000);
        
        const messageHandler = (data) => {
            try {
                const response = JSON.parse(data.toString());
                
                // Checks if we've received bus data
                if (response.params && response.params.resource && response.params.resource.member) {
                    clearTimeout(timeout);
                    socket.removeListener("message", messageHandler);
                    //console.log(`Received data for ${area} with ${response.params.resource.member.length} buses`);
                    resolve(response);
                }
            } catch (error) {
                console.error(`Error parsing ${area} socket message:`, error);
            }
        };
        
        socket.on("message", messageHandler);
        
        // Sets a time limit for how long to collect 
        setTimeout(() => {
            socket.removeListener("message", messageHandler);
            clearTimeout(timeout);
            resolve({"status": "completed", "area": area});
        }, 5000);
    });
}

// Loads the file that stores the first bus route data
function loadRoutes() {
    try {
        if (fs.existsSync(ROUTES_FILE)) {
            return JSON.parse(fs.readFileSync(ROUTES_FILE, "utf8"));
        }
    } catch (error) {
        console.error("Error loading routes file:", error);
    }
    return {};
}

function saveRoutes(routes) {
    try {
        fs.writeFileSync(ROUTES_FILE, JSON.stringify(routes, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving routes file:", error);
    }
}

// Function to add bus routes to local file (not currently used as all the routes have been added) 
function addRoute(line_name, operator, direction, coordinates) {
    let routes = loadRoutes();
    const routeKey = `${line_name}_${operator}_${direction}`;

    // Only adds the route if it doesn't exist
    if (!routes[routeKey]) {
        routes[routeKey] = coordinates;
        saveRoutes(routes);
        console.log(`Route for ${line_name} (${operator}) added successfully.`);
    }
}

// Function to return buses in the bounds
function getBusesInBounds(busData, minX, minY, maxX, maxY) {
    let filteredBuses = [];

    busData.forEach(bus => {
        if (bus.longitude >= minX && bus.longitude <= maxX && 
            bus.latitude >= minY && bus.latitude <= maxY) {
            filteredBuses.push(bus);
        }
    });

    return filteredBuses;
}

module.exports = router;
