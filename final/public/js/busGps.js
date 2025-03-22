/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus GPS tracking on the map
 */

// Modules
import { setViewAllBuses, getViewAllBuses, getViewportBounds, updateBusesAndStops } from "./map.js";
import { getBusRoute, drawBusRoute, removeRoute } from "./busRoute.js";
import { showNotification } from "./helper.js";
import { getUserCoordinates } from "./userlocation.js";

let routeNumber;
let nocCode;

// ------------------ Function to get the bus data for a specific bus route ------------------ 
async function getSpecificBusGPS(route, useBounds, lat, lng) {
    try {
        let response = "";

        if (useBounds) {
            const { minX, minY, maxX, maxY } = getViewportBounds();
            response = await $.get(`/api/buses/find/${route}?minX=${minX}&minY=${minY}&maxX=${maxX}&maxY=${maxY}`);
        } else if (!(lat && lng)) {
            const { lat, lng } = getUserCoordinates();
            response = await $.get(`/api/buses/find/${route}?lat=${lat}&lon=${lng}`);
        } else {
            response = await $.get(`/api/buses/find/${route}?lat=${lat}&lon=${lng}`);
        }

        const busData = response || [];
        
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
        
        return busData;
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

    //console.log(busData)
    // Check if busData is valid
    if (!busData || busData.length === 0) {
        //console.log("No bus data available to display");
        return;
    }

    // Draw each bus marker
    busData.forEach( coord => { 
        // Make sure we have valid coordinates
        if (!coord.latitude || !coord.longitude) {
            return;
        }
        
        // create icon by fetching API endpoint that returns image
        const icon = L.icon({
            iconUrl: `/api/busimages/get?noc=${coord.noc}&routeName=${coord.route}&bearing=${coord.heading}`, 
            iconSize: [40, 60], 
        });

        const circle = L.marker([coord.latitude, coord.longitude], {icon: icon}).addTo(map);

        const toolTipContent = ` 
            <div>
                <strong>Route: ${coord.route || "Unknown"}</strong><br>
                Destination: ${coord.destination || "Unknown"}<br>
            </div>
        `;

        circle.bindTooltip(toolTipContent, { permanent: false, direction: "top" });

        // Add click event listener to the bus marker
        circle.on("click", async (event) => {
            nocCode = coord.noc;
            routeNumber = coord.route;
            setViewAllBuses(false);
            
            // Update URL to reflect the selected bus route
            updateURLWithRoute(coord.route);

            //console.log(coord.noc)
            //console.log(coord.serviceId)
            //console.log(coord.tripId)
            //console.log(coord.route)

            // Only try to show specific route if we have serviceId and tripId
            // if (coord.serviceId && coord.tripId) {
                await showSpecificBusRoute(coord.serviceId, coord.tripId, coord.journeyId, coord.route, map, coord.noc);
            // } else {
                // const newUrl = window.location.origin + window.location.pathname;
                // window.history.pushState({ path: newUrl }, "", newUrl);
                // showNotification("Route information not available", "warning");
            

            // Reset tooltips on all markers
            map.busMarkers.forEach(marker => {
                marker.closeTooltip(); 
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: "top" });
            });
        });
        map.busMarkers.push(circle);
    });

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
async function showSpecificBusRoute(serviceId, busId, journeyId, busNumber, map, noc) { 

    let routeNumber;

    if (!map.busMarkers) {
        map.busMarkers = [];
    } else {
        // Remove existing bus markers
        map.busMarkers.forEach(marker => map.removeLayer(marker));
        map.busMarkers = [];
    }

    try {
        const response = await getBusRoute(serviceId, busId, journeyId, noc, busNumber);
        const { routeCoords, destination } = response;
        routeNumber = response.routeNumber;

        if (routeCoords && routeCoords.length > 0) {
            const routeLine = drawBusRoute(routeCoords, routeNumber, destination, map);
            
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


// Export functions
export { getAllBusGPS, getSpecificBusGPS, drawBus, getRouteNumber, getNocCode, showSpecificBusRoute };