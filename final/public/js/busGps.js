/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus GPS tracking on the map
 */

// Modules
import { setViewAllBuses, getViewAllBuses, getViewportBounds } from "./map.js";
import { getBusRoute, drawBusRoute } from "./busRoute.js";
import { showNotification } from "./helper.js"; // Import notification function

let routeNumber;
let nocCode;

// ------------------ Function to get the bus data for a specific bus route ------------------ 
async function getSpecificBusGPS(nocCode, route) {
    if (!nocCode) {
        console.log("no noc code");
        showNotification("Error 1 fetching bus noc code", "error");
        return;
    }

    try {
        // Call our server endpoint 
        const response = await $.get(`/api/buses/${nocCode}/${route}`);
        
        // Check if response is empty or invalid
        if (!response || (Array.isArray(response) && response.length === 0)) {
            console.log("Empty response from specific bus API");
            const allBuses = await getAllBusGPS(maxY, maxX, minY, minX) || [];
            let filteredBuses = getFilteredBuses(allBuses, busNumber);
            return filteredBuses;
        }
        
        return response;
    } catch (error) {
        console.error("Error fetching specific bus data:", error);
        showNotification("Error 2 fetching specific bus data", "warning");
        
        const allBuses = await getAllBusGPS(maxY, maxX, minY, minX) || [];
        let filteredBuses = getFilteredBuses(allBuses, busNumber);
        return ;
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
        showNotification("Error  3fetching bus data", "error");
        return [];
    }
}

async function findBus(serviceNumber, lat, lon, map) {
    console.log("Bus Service Number:", serviceNumber);
    console.log("Latitude:", lat);
    console.log("Longitude:", lon);

    try {
        // Call the new API endpoint
        const response = await $.get(`/api/buses/find/${serviceNumber}?lat=${lat}&lon=${lon}&radius=50`);
        const busData = response || [];

        console.log("Fetched Bus Data:", busData);

        if (busData.length === 0) {
            console.log("No buses found for this service.");
            return;
        }

        let filteredBuses = busData.filter(bus => bus.route === serviceNumber);

        console.log("Filtered Buses:", filteredBuses);
        console.log("NOC:", filteredBuses[0]?.noc);

        if (filteredBuses[0]?.noc) {
            setViewAllBuses(false, filteredBuses[0].noc, serviceNumber);

            drawBus(filteredBuses, map);

            if (filteredBuses[0].serviceId && filteredBuses[0].tripId) {
                await showSpecificBusRoute(filteredBuses[0].serviceId, filteredBuses[0].tripId, serviceNumber, map);
            } else {
                showNotification("Route information not available", "warning");
            }
        } else {
            showNotification("No bus operator found for this service", "warning");
        }
    } catch (error) {
        console.error("Error finding bus:", error);
    }
}

// ------------------ Function to draw the buses ------------------
function drawBus(busData, map) {
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

    console.log(busData)
    // Check if busData is valid
    if (!busData || busData.length === 0) {
        console.log("No bus data available to display");
        return;
    }

    // Draw each bus marker
    busData.forEach(coord => { 
        // Make sure we have valid coordinates
        if (!coord.latitude || !coord.longitude) {
            return;
        }
        
        const icon = L.icon({
            iconUrl: "./images/BusTracker.png", 
            iconSize: [44.5, 25],  
        });
    
        const circle = L.marker([coord.latitude, coord.longitude], {icon: icon}).addTo(map);

        const toolTipContent = ` 
            <div>
                <strong>Route: ${coord.route || 'Unknown'}</strong><br>
                Destination: ${coord.destination || 'Unknown'}<br>
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

            console.log(coord.serviceId)
            console.log(coord.tripId)
            console.log(coord.route)

            // Only try to show specific route if we have serviceId and tripId
            if (coord.serviceId && coord.tripId) {
                await showSpecificBusRoute(coord.serviceId, coord.tripId, coord.route, map);
            } else {
                showNotification("Route information not available", "warning");
            }

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
async function showSpecificBusRoute(serviceId, busId, busNumber, map) { 
    if (!map.busMarkers) {
        map.busMarkers = [];
    } else {
        // Remove existing bus markers
        map.busMarkers.forEach(marker => map.removeLayer(marker));
        map.busMarkers = [];
    }

    // Fetch and draw route
    try {
        const { routeCoords, routeNumber, destination } = await getBusRoute(serviceId, busId);
        if (routeCoords && routeCoords.length > 0) {
            const routeLine = drawBusRoute(routeCoords, routeNumber, destination, map);
            
            // Use the adjustMapViewToRoute function which now sets flags to prevent redundant API calls
            if (typeof adjustMapViewToRoute === 'function') {
                adjustMapViewToRoute(routeLine);
            }
        } else {
            throw new Error("No route coordinates found");
        }
    } catch (error) {
        console.error("Error fetching bus route:", error);
        showNotification("Error 4fetching bus route", "error");
    }

    // Get the viewport bounds for potential fallback
    const { minX, minY, maxX, maxY } = getViewportBounds();

    // Fetch and draw buses with matching NOC and route
    try {
        console.log("1.1")
        if (nocCode && routeNumber) {
            console.log("1.2")
            const specificBusData = await getSpecificBusGPS(nocCode, routeNumber);
            if (specificBusData && specificBusData.length > 0) {
                console.log("1.3")
                drawBus(specificBusData, map);
            } else {
                console.log("1.4")
                throw new Error("No specific bus data found");
            }
        } else {
            console.log("1.5")
            throw new Error("Missing nocCode or routeNumber");
        }
    } catch (error) {
        
        console.log("1.6")
        console.log("Falling back to all buses in viewport:", error);
        // Fallback to showing all buses in viewport
        try {
            console.log("1.7")
            const allBuses = await getAllBusGPS(maxY, maxX, minY, minX) || [];
            let filteredBuses = getFilteredBuses(allBuses, busNumber);
            drawBus(filteredBuses, map);
        } catch (fallbackError) {
            console.log("1.8")
            console.error("Error in fallback bus display:", fallbackError);
            showNotification("Could not display buses at this time", "error");
        }
    }
}

function getFilteredBuses(allBuses, busNumber) {
    if (!allBuses || !Array.isArray(allBuses)) return [];

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