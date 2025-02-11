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

    // Check if busData is initialized
    if (typeof busData === "undefined") {
        busData = {};
    }

    try {
        // First API call: Fetch tripId if it's undefined
        if (!tripId) {
            console.log("Fetching trip ID...");
            const url1 = `https://bustimes.org/vehicles.json?service=${serviceId}`;
            const response1 = await fetch(url1);
            const data1 = await response1.json();

            if (data1.length > 0) {
                tripId = data1[0].trip_id; // Assign the first tripId found
                busData.tripId = tripId; 
            } else {
                console.error("No trip ID found for service:", serviceId);
                busRouteNotFound = true;
                return [];
            }
        }

        // Second API call: Fetch route details using tripId
        console.log(`Fetching route data for tripId: ${tripId}`);
        const url2 = `https://bustimes.org/api/trips/${tripId}/?format=json`;
        const response2 = await fetch(url2);
        const data2 = await response2.json();

        if (!data2.times || data2.times.length === 0) {
            console.error("No route data found for trip ID:", tripId);
            busRouteNotFound = true;
            return [];
        }

        busRouteNotFound = false;

        // Extract route coordinates
        data2.times.forEach(stop => {
            if (stop.track) {
                stop.track.forEach(coord => {
                    routeCoords.push([coord[1], coord[0]]);
                });
            } else if (stop.stop && stop.stop.location) {
                routeCoords.push([stop.stop.location[1], stop.stop.location[0]]);
            }
        });

        console.log("Route coordinates fetched:", routeCoords);
        return routeCoords;
        
    } catch (error) {
        console.error("Error fetching bus route:", error);
        return [];
    }
}


function drawBusRoute(routeCoords, map) {
    if (!map) {
        console.error("Map is not initialized!");
        return;
    }

    // // Remove previous bus route
    // if (route) {
    //     map.removeLayer(route);
    // }

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
    // htmlContent += `
    //     <div class="bus-time-record">
    //         <h2>${coord.route} <span id="destination">to ${coord.destination}</span></h2>
    //     </div
    // `;
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

export { getBusRoute, drawBusRoute };

