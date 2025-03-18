/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus route on the map
 */

import { showNotification } from "./helper.js"; // Import notification function
import { adjustMapViewToRoute } from "./map.js";

let route; 
let busRouteNotFound = false;
let busData;


// ------------------ Function to get the bus route ------------------

async function getBusRoute(serviceId, tripId, journeyId) {
    try {
        // Call our server endpoint 
        const response = await $.get(`/api/buses/routes/?serviceId=${serviceId}&tripId=${tripId}&journeyId=${journeyId}`);
        return response;
    } catch (error) {
        console.error("Error fetching bus route data:", error);
        showNotification("Error fetching bus route data", "error");
    }
}

function drawBusRoute(routeCoords, routeNumber, destination, map) {
    if (!map) {
        console.error("Map is not initialized!");
        return;
    }

    removeRoute(map);

    // Ensure routeCoords is an array and has valid coordinates
    if (!Array.isArray(routeCoords) || routeCoords.length === 0) {
        console.error("Invalid route coordinates:", routeCoords);
        return;
    }

    // Create and add a new polyline
    route = L.polyline(routeCoords, {
        color: "#3498db",
        weight: 4,
        opacity: 0.8,
    }).addTo(map);

    adjustMapViewToRoute(route, map);

    // Update the refresh time
    const now = new Date();
    const formattedTime = now.toLocaleTimeString(); 

    var htmlContent="";
    htmlContent += `
        <div class="bus-time-record">
            <h2>${routeNumber} <span id="destination">to ${destination}</span></h2>
        </div
    `;
    if (busRouteNotFound === true) {
        htmlContent += `<h2>Bus route not found</h2>`
    }
    
    // append html to DOM
    $("#bus-data").html(htmlContent);
    return route;
}

function removeRoute(map) {
    if (route) {
        map.removeLayer(route);
        route = null;
    }
}

export { getBusRoute, drawBusRoute, removeRoute };

