/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus route on the map
 */

import { showNotification } from "./helper.js"; // Import notification function

let route; 
let busRouteNotFound = false;
let busData;


// ------------------ Function to get the bus route ------------------

async function getBusRoute(serviceId, tripId) {
    let routeCoords = [];
    let routeNumber = "";
    let destination = "";

    if (typeof busData === "undefined") {
        busData = {};
    }

    try {
        // Fetch tripId if it's undefined
        if (!tripId) {
            const url1 = `https://bustimes.org/vehicles.json?service=${serviceId}`;
            const response1 = await fetch(url1);

            if (!response1.ok) {
                showNotification("Failed to fetch route", "error");
                throw new Error(`Failed to fetch tripId: ${response1.status} ${response1.statusText}`);
            }

            const data1 = await response1.json();

            if (!data1 || data1.length === 0 || !data1[0].trip_id) {
                showNotification("No route found", "error");
                return { error: "No trip ID found", routeCoords: [], routeNumber: "", destination: "" };
            }

            tripId = data1[0].trip_id;
            busData.tripId = tripId;
        }

        // Ensure tripId is valid
        if (!tripId) {
            showNotification("Invalid route received.", "error");
            return { error: "Invalid trip ID", routeCoords: [], routeNumber: "", destination: "" };
        }

        // Fetch route details
        const url2 = `https://bustimes.org/api/trips/${tripId}/?format=json`;
        const response2 = await fetch(url2);

        if (!response2.ok) {
            showNotification("Failed to fetch route", "error");
            throw new Error(`Failed to fetch route data: ${response2.status} ${response2.statusText}`);
        }

        const data = await response2.json();

        if (!data.times || data.times.length === 0) {
            showNotification("No route found", "error");
            return { error: "No route data found", routeCoords: [], routeNumber: "", destination: "" };
        }

        // Extract route number
        routeNumber = data.service?.line_name || "Unknown Route";

        // Extract route coordinates and destination
        data.times.forEach((stop, index) => {
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
            if (index === data.times.length - 1) {
                destination = stop.stop?.name || "Unknown Destination";
            }
        });

        // Validate route coordinates
        if (routeCoords.length === 0) {
            showNotification("Invalid route coordinates for route", "warning");
            return { error: "Invalid route coordinates", routeCoords: [], routeNumber, destination };
        }

        return { routeCoords, routeNumber, destination };

    } catch (error) {
        console.error("Error fetching bus route:", error.message);
        showNotification("Error fetching bus route", "error");
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
}


// ------------------ Helper function to adjust the map view to the newly drawn route ------------------
function adjustMapViewToRoute(route, map) {
    if (route) {
        map.fitBounds(route.getBounds());
    }
}

function removeRoute(map) {
    if (route) {
        map.removeLayer(route);
        route = null;
    }
}

export { getBusRoute, drawBusRoute, removeRoute };

