/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus GPS tracking on the map
 */

// Modules
import { setViewAllBuses, getViewAllBuses } from "./map.js";
import { getBusRoute, drawBusRoute } from "./busRoute.js";

let gpsRoute;
let nocCode;

// ------------------ Function to get the bus data for a specific bus route ------------------ 
async function getSpecificBusGPS(nocCode, route) {
    console.log("code is " + nocCode);
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
        console.log(busData);
        return busData;
    } else {
        console.error("Error fetching bus data.");
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
            console.log(bus.coordinates);
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
        console.log(busData);
        return busData
    } else {
        console.error("Error fetching bus data.");
    }
}

// ------------------ Function to draw the buses ------------------
function drawBus(busData, map) {

    console.log(busData);
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
    
        console.log(coord.latitude);
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
            console.log("noc code is 1" + nocCode)
            gpsRoute = coord.route;
            setViewAllBuses(false);

            await showSpecificBusRoute(coord.serviceId, coord.tripId, map);

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
async function showSpecificBusRoute(serviceId, busId, map) { 
    // Clear existing bus markers
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => map.removeLayer(marker));
    }

    // Fetch and draw route
    const routeCoords = await getBusRoute(serviceId, busId);
    drawBusRoute(routeCoords, map);

    // Fetch and draw buses with matching NOC and route
    const specificBusData = await getSpecificBusGPS(nocCode, gpsRoute);
    drawBus(specificBusData, map);
}

function getNocCode() {
    return nocCode;
}

function getGpsRoute() {
    return gpsRoute;
}

// Export functions
export { getAllBusGPS, getSpecificBusGPS, drawBus, getGpsRoute, getNocCode };