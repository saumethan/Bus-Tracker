/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus route on the map
 */

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
            const data1 = await response1.json();

            if (data1.length > 0) {
                tripId = data1[0].trip_id;
                busData.tripId = tripId; 
            } else {
                console.error("No trip ID found for service:", serviceId);
                busRouteNotFound = true;
                return { routeCoords: [], routeNumber: "", destination: "" };
            }
        }

        // Fetch route details
        const url2 = `https://bustimes.org/api/trips/${tripId}/?format=json`;
        const response2 = await fetch(url2);
        const data = await response2.json();

        if (!data.times || data.times.length === 0) {
            console.error("No route data found for trip ID:", tripId);
            busRouteNotFound = true;
            return { routeCoords: [], routeNumber: "", destination: "" };
        }

        busRouteNotFound = false;

        // Extract route number
        routeNumber = data.service.line_name || "Unknown Route";

        // Extract route coordinates and destination
        data.times.forEach((stop, index) => {
            if (stop.track) {
                stop.track.forEach(coord => {
                    routeCoords.push([coord[1], coord[0]]); // Reverse order to [lat, lon]
                });
            } 
            if (stop.stop && stop.stop.location) {
                routeCoords.push([stop.stop.location[1], stop.stop.location[0]]);
            }

            // Set last stop as the destination
            if (index === data.times.length - 1) {
                destination = stop.stop.name;
            }
        });

        return { routeCoords, routeNumber, destination };

    } catch (error) {
        console.error("Error fetching bus route:", error);
        return { routeCoords: [], routeNumber: "", destination: "" };
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
        color: '#3498db',
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

