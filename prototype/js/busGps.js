/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus GPS tracking on the map
 */

// Modules
import { setViewAllBuses, getViewAllBuses, getViewportBounds } from "./map.js";
import { getBusRoute, drawBusRoute } from "./busRoute.js";

let routeNumber;
let nocCode;

// ------------------ Function to get the bus data for a specific bus route ------------------ 
async function getSpecificBusGPS(nocCode, route) {
    if (nocCode) {

        const url = `https://bustimes.org/vehicles.json?operator=${nocCode}`;

        const response = await $.ajax({
            type: "GET",
            url: url,
            contentType: "application/json"
        });
    
        if (response) {
            const busData = [];
            response.forEach(bus => {
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
            return busData;
        } else {
            console.error("Error fetching bus data.");
        }
    } else {
        console.log("no noc code");
    }
}

// ------------------ Function to get the bus data for all bus routes in viewport ------------------
async function getAllBusGPS(yMax, xMax, yMin, xMin) {

    const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;

    const response = await $.ajax({
        type: "GET",
        url: url,
        contentType: "application/json"
    });

    if (response) {
        const busData = [];
        response.forEach(bus => {
            if (!bus.coordinates || !Array.isArray(bus.coordinates)) return;
            const [longitude, latitude] = bus.coordinates;
            // Validate coordinate ranges
            if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
            busData.push({
                longitude: longitude,
                latitude: latitude,
                route: bus.service.line_name,
                destination: bus.destination,
                tripId: bus.trip_id,
                serviceId: bus.service_id,
                noc: bus.vehicle.url.split("/")[2].split("-")[0].toUpperCase()
            });
        })
        return busData
    } else {
        console.error("Error fetching bus data.");
    }
}

async function findBus(serviceNumber, destination, lat, lon, map) {
    console.log("Bus Service Number:", serviceNumber);
    console.log("Bus destination:", destination);
    console.log("Latitude:", lat);
    console.log("Longitude:", lon);

    // Calculate bounds (adjust the bounds based on the clicked coordinates)
    const bounds = calculateBounds(lat, lon, 50);
    const busData = await getAllBusGPS(bounds.yMax, bounds.xMax, bounds.yMin, bounds.xMin);

    console.log(busData);

    let filteredBuses = [];

    // Loop through bus data and filter buses based on route and destination
    busData.forEach(bus => {
        // Match bus route with serviceNumber and destination
        if (bus.route === serviceNumber ) {
            filteredBuses.push(bus);
        }
    });

    console.log("Filtered Buses:", filteredBuses);
    console.log(filteredBuses[0]?.noc);

    if(filteredBuses[0]?.noc) {
        try {
        setViewAllBuses(false, filteredBuses[0]?.noc, serviceNumber);
        drawBus(filteredBuses, map);
        await showSpecificBusRoute(filteredBuses[0]?.serviceId, filteredBuses[0]?.tripId, serviceNumber, map);

        } catch {
            console.log("Finish me")
            // const { minX, minY, maxX, maxY } = getViewportBounds();
            // const allBuses = await getAllBusGPS(maxY, maxX, minY, minX);
                        
            // let filteredBuses = getFilteredBuses(allBuses, getRouteNumber());
            // drawBus(filteredBuses, map);
        }
    }
    
}

function calculateBounds(lat, lon, zoom) {
    const LATITUDE_DIFFERENCE = 0.0025;
    const LONGITUDE_DIFFERENCE = 0.0035; 

    let yMax = lat + (LATITUDE_DIFFERENCE * zoom);
    let yMin = lat - (LATITUDE_DIFFERENCE * zoom);
    let xMax = lon + (LONGITUDE_DIFFERENCE * zoom);
    let xMin = lon - (LONGITUDE_DIFFERENCE * zoom);

    if (yMax > 90) yMax = 90;
    if (yMin < -90) yMin = -90;
    if (xMax > 180) xMax = 180;
    if (xMin < -180) xMin = -180;

    return {
        yMax, xMax, yMin, xMin
    };
}

// ------------------ Function to draw the buses ------------------
function drawBus(busData, map) {
    // Remove existing bus markers
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }

    if (busData === null) {
        return;
    }
    
    map.busMarkers = [];

    // Draw each bus marker
    busData.forEach(coord => { 
        const icon = L.icon({
            iconUrl: "./images/BusTracker.png", 
            iconSize: [44.5, 25],  
        });
    
        const circle = L.marker([coord.latitude, coord.longitude], {icon: icon}).addTo(map);

        const toolTipContent = ` 
            <div>
                <strong>Route: ${coord.route}</strong><br>
                Destination: ${coord.destination}<br>
            </div>
        `;

        circle.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });

        // Add click event listener to the bus marker
        circle.on('click', async (event) => {
            nocCode = coord.noc;
            routeNumber = coord.route;
            setViewAllBuses(false);

            await showSpecificBusRoute(coord.serviceId, coord.tripId, coord.route, map);

            // Reset tooltips on all markers
            map.busMarkers.forEach(marker => {
                marker.closeTooltip(); 
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
            });
        });
        map.busMarkers.push(circle);
    });

    // Close tooltips when clicking elsewhere on the map
    map.on('click', () => {
        map.busMarkers.forEach(marker => {
            marker.closeTooltip();
            marker.unbindTooltip();
        });
    });
}

// ------------------ Function to update map with specific bus route ------------------
async function showSpecificBusRoute(serviceId, busId, busNumber, map) { 
    console.log(serviceId, busId)
    // Clear existing bus markers
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => map.removeLayer(marker));
    }

    // Fetch and draw route
    const { routeCoords, routeNumber, destination } = await getBusRoute(serviceId, busId);
    drawBusRoute(routeCoords, routeNumber, destination, map);

    // Fetch and draw buses with matching NOC and route
    
    try {
        const specificBusData = await getSpecificBusGPS(nocCode, routeNumber);
        drawBus(specificBusData, map);
    } catch {
        const { minX, minY, maxX, maxY } = getViewportBounds();
        const allBuses = await getAllBusGPS(maxY, maxX, minY, minX);

        let filteredBuses = getFilteredBuses(allBuses, busNumber);
        drawBus(filteredBuses, map);
    }
}

function getFilteredBuses(allBuses, busNumber) {
    let filteredBuses = [];

    // Loop through bus data and filter buses based on route and destination
    allBuses.forEach(bus => {
        // Match bus route with serviceNumber and destination
        if (bus.route === busNumber ) {
            filteredBuses.push(bus);
        }
    });
    return filteredBuses;
}

function getNocCode() {
    return nocCode;
}

function getRouteNumber() {
    return routeNumber;
}

// Export functions
export { getAllBusGPS, getSpecificBusGPS, drawBus, getRouteNumber, getNocCode, findBus, getFilteredBuses };