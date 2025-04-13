/**
 * @author Ethan Saum @saumethan
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus GPS tracking on the map
 */

// Modules
import { setViewAllBuses, getViewportBounds } from "./map.js";
import { getBusRoute, drawBusRoute } from "./busRoute.js";
import { showNotification } from "./helper.js";
import { getUserCoordinates } from "./userlocation.js";

// Variables
const busImageCache = {};
let busIconRequestController = null;
let routeNumber;
let nocCode;

// ------------------ Function to get the bus data for a specific bus route ------------------ 
async function getSpecificBusGPS(route, useBounds, isSearch, lat, lng) {
    try {
        let response = [];

        if (useBounds) {
            let { minX, minY, maxX, maxY } = getViewportBounds();
            console.log(minX, minY, maxX, maxY)
            let radius = Math.abs(maxX - minX);

            while (isSearch && radius < 50) {
                response = await $.get(`/api/buses/find/${route}?minX=${minX}&minY=${minY}&maxX=${maxX}&maxY=${maxY}`);
                
                if (response.length > 0) break; // Stop if results are found
                
                // Expand search area
                minX -= .5;
                minY -= .5;
                maxX += .5;
                maxY += .5;
                radius = Math.abs(maxX - minX);

                if (radius >= 70) break; // Limit expansion to a radius of 70
            }

            if (response.length === 0) { 
                response = await $.get(`/api/buses/find/${route}?minX=${minX}&minY=${minY}&maxX=${maxX}&maxY=${maxY}`);
            }
        } else {
            if (!(lat && lng)) {
                ({ lat, lng } = getUserCoordinates());
            }

            response = await $.get(`/api/buses/find/${route}?lat=${lat}&lon=${lng}`);
        }

        return response || [];
        
        // if (busData.length === 0) {
        //     //console.log("No buses found for this service.");
        //     showNotification("No live buses found for this route", "info")
        //     // Remove all URL parameters
        //     // Update URL without refreshing page
        //     const newUrl = window.location.origin + window.location.pathname;
        //     window.history.pushState({ path: newUrl }, "", newUrl);

        //     setViewAllBuses(true);
        //     removeRoute(map);
        //     updateBusesAndStops();
        //     return;
        // }

        //console.log(busData)
        
    } catch (error) {
        console.error("Error fetching specific bus data:", error);
        showNotification("Error 2 fetching specific bus data", "warning");
    }
}

// ------------------ Function to get the bus data for all bus routes in viewport ------------------
async function getAllBusGPS(yMax, xMax, yMin, xMin) {
    try {
        // Call our server endpoint 
        const response = await $.get(`/api/buses?yMax=${yMax}&xMax=${xMax}&yMin=${yMin}&xMin=${xMin}`);
        return response || [];
    } catch (error) {
        console.error("Error fetching bus data:", error);
        showNotification("Error 3fetching bus data", "error");
        return [];
    }
}

// ------------------ Function to create a bus marker on on the map ------------------
function createMarker(map, coord, iconUrl) {
    // create marker with leaflet
    const icon = L.icon({
        iconUrl: iconUrl, 
        iconSize: [40, 60], 
    });
    const circle = L.marker([ coord.latitude, coord.longitude ], { icon: icon }).addTo(map);

    // create tooltip for marker
    const toolTipContent = `
        <div>
            <strong>Route: ${coord.route || "Unknown"}</strong><br>
            Destination: ${coord.destination || "Unknown"}<br>
        </div>
    `;
    circle.bindTooltip(toolTipContent, { permanent: false, direction: "top" });

    // add click event listener to the bus marker
    circle.on("click", async (event) => {
        nocCode = coord.noc;
        routeNumber = coord.route;
        setViewAllBuses(false);
        
        // update URL to reflect the selected bus route
        updateURLWithRoute(coord.route);

        // only try to show specific route if we have serviceId and tripId
        await showSpecificBusRoute(coord.serviceId, coord.tripId, coord.journeyId, coord.route, map, coord.noc, coord.direction, coord.destination);

        // reset tooltips on all markers
        map.busMarkers.forEach(marker => {
            marker.closeTooltip(); 
            marker.unbindTooltip();
            marker.bindTooltip(toolTipContent, { permanent: false, direction: "top" });
        });
    });

    map.busMarkers.push(circle);

    return circle;
}

// ------------------ Function to draw the buses ------------------
async function drawBus(busData, map) {
    // Initialise busMarkers if it doesn't exist
    if (!map.busMarkers) {
        map.busMarkers = [];
    } else {
        // Remove existing bus markers
        map.busMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
        // Clear the array
        map.busMarkers = [];
    }

    // Check if busData is valid
    if (!busData || busData.length === 0) return;

    // Draw each bus marker
    for (let i = 0; i < busData.length; i++) {
        // Make sure we have valid coordinates
        const coord = busData[i];
        if (!coord.latitude || !coord.longitude) continue;

        // Find the icon for this bus
        let busIcon
        Object.keys(busImageCache).forEach(key => {
            if (key.includes(`${coord.noc}-${coord.route}`)) {
                const thisHeading = parseInt(key.split("-")[2]);
                if (Math.abs(thisHeading-coord.heading) <= 20 || Math.abs(thisHeading-coord.heading) >= 340) {
                    busIcon = busImageCache[key];
                }
            }
        });

        if (busIcon) {
            createMarker(map, coord, busIcon);
        } else {
            // try to fetch bus icon
            fetch(`/api/busimages/get?noc=${coord.noc}&routeName=${coord.route}&bearing=${coord.heading}`)
                .then(response => response.blob())
                .then(blob => {
                    const iconUrl = URL.createObjectURL(blob);
                    busImageCache[`${coord.noc}-${coord.route}-${coord.heading}`] = iconUrl;
                    createMarker(map, coord, iconUrl);
                })
                .catch(error => {
                    console.error(`Error fetching icon for bus ${coord.noc}-${coord.route}:`, error);
                });
        }
    }
    
    // Close tooltips when clicking elsewhere on the map
    map.on("click", () => {
        map.busMarkers.forEach(marker => {
            marker.closeTooltip();
            marker.unbindTooltip();
        });
    });
}

// ------------------ Function to update URL without reloading the page ------------------
function updateURLWithRoute(route) {
    // Update URL without refreshing page
    const newUrl = window.location.origin + window.location.pathname + `?bus=${route}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
}

// ------------------ Function to update map with specific bus route ------------------
async function showSpecificBusRoute(serviceId, busId, journeyId, busNumber, map, noc, direction, busDestination) { 
    let routeNumber;

    if (!map.busMarkers) {
        map.busMarkers = [];
    } else {
        // Remove existing bus markers
        map.busMarkers.forEach(marker => map.removeLayer(marker));
        map.busMarkers = [];
    }

    try {
        const response = await getBusRoute(serviceId, busId, journeyId, noc, busNumber, direction);
        const { routeCoords, destination } = response;
        routeNumber = response.routeNumber;

        const finalDestination = destination || busDestination

        if (routeCoords && routeCoords.length > 0) {
            const routeLine = drawBusRoute(routeCoords, routeNumber, finalDestination, map);
            
            if (typeof adjustMapViewToRoute === "function") {
                adjustMapViewToRoute(routeLine);
            }
        } else {
            //console.log("No route found");
            showNotification("No route available", "warning");
        }
    } catch (error) {
        console.error("Error fetching bus route:", error);
        showNotification("Error 4fetching bus route", "error");
    }

    if (routeNumber) {
        try {
            const busData = await getSpecificBusGPS(routeNumber, true);
            drawBus(busData, map);
        } catch (error) {
            //console.log(error);
        }
    } else if (busNumber) {
        try {
            const busData = await getSpecificBusGPS(busNumber, true);
            drawBus(busData, map);
        } catch (error) {
            //console.log(error);
        }
    } else {
        showNotification("Could not display buses at this time", "error");
    }
}

function getNocCode() {
    return nocCode;
}

function getRouteNumber() {
    return routeNumber;
}

// Clear bus cache every 20 seconds to free up memory
setInterval(() => {
    // release object URLs to avoid memory leaks
    Object.values(busImageCache).forEach(url => {
        URL.revokeObjectURL(url);
    });
    
    // clear the cache object
    Object.keys(busImageCache).forEach(key => delete busImageCache[key]);
}, 60000);

//https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
// Listen for viewAllBusesChanged event
document.addEventListener("viewAllBusesChanged", (event) => {
    if (!event.detail.viewAllBuses && busIconRequestController) {
        busIconRequestController.abort();
        busIconRequestController = null;
        console.log("1 Canceled pending bus icon requests.");
    }
});

document.addEventListener("zoomedOut", (event) => {
    console.log(event.detail.zoom)
    if (!event.detail.zoom <= 12 && busIconRequestController) {
        busIconRequestController.abort();
        busIconRequestController = null;
        console.log("2 Canceled pending bus icon requests.");
    }
});

// Export functions
export { getAllBusGPS, getSpecificBusGPS, drawBus, getRouteNumber, getNocCode, showSpecificBusRoute };