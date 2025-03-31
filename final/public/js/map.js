/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

// Modules
import { getAllBusGPS, getSpecificBusGPS, drawBus, getNocCode, getRouteNumber, showSpecificBusRoute } from "./busGps.js";
import { fetchStopsInViewport, drawStops, loadStopTimes, fetchSpecificStopLocation } from "./stops.js";
import { removeRoute } from "./busRoute.js";
import { showNotification } from "./helper.js";
import { initializeCookieStorage, setupCookieBar } from "./cookies.js";
import { getUserLocation, drawUserLocation, initUserLocationTracking, getUserCoordinates, saveLocationToCookie } from "./userlocation.js";
import { closePanel } from "./grabber.js";
import { getRouteData } from "./planJourney.js";

// Variables
let map;  
let inactivityTimeout;
let viewAllBuses = true;
let noc = null;
let route = null;
let plannedRoute = null;
let busUpdateInProgress = false;
let ignoreNextMoveEnd = false;
let ignoreNextZoomEnd = false;
let currentRouteButton = null;

// Constants for zoom levels
const MIN_BUS_ZOOM = 12;
const MIN_STOP_ZOOM = 15;

// Initialize the map and set its location
function createMap() {
    const mapInstance = L.map("map", {
        zoomControl: false, 
        doubleTapDragZoom: "center",
        doubleTapDragZoomOptions: {
            reverse: true
        }
    });
    mapInstance.setView([57.1497, -2.0943], 15); // Aberdeen
    addTileLayer(mapInstance); 
    return mapInstance;
}

// ------------------ Function to add home button to the map ------------------
function addHomeButtonToMap() {
    // Home button 
    const homeButton = L.control({ position: "topright" });

    homeButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create("div", "map-button");
        buttonDiv.innerHTML = "<button id='home-button'><i class='fa-solid fa-house'></i></button>";

        // Event listener for the button
        buttonDiv.addEventListener("click", async () => {
            
            // Set flag to indicate all buses are shown
            setViewAllBuses(true);
            
            // Update the UI
            removeRoute(map);
            removePlannedRoute(map);
            currentRouteButton.remove();
            updateBusesAndStops();
            
            // Clear bus data container
            $("#bus-data").html("");
            closePanel();

            // Remove all URL parameters
            // Update URL without refreshing page
            const newUrl = window.location.origin + window.location.pathname;
            window.history.pushState({ path: newUrl }, "", newUrl);
        });

        return buttonDiv;
    };

    // Add to map
    homeButton.addTo(map);
}

// ------------------ Function to add refresh button to the map ------------------
function addRefreshButtonToMap() {
    // Refresh buses 
    const refreshButton = L.control({ position: "topright" });

    refreshButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create("div", "map-button-reset");
        buttonDiv.innerHTML = "<button id='reset-button'><i class='fa-solid fa-arrows-rotate'></i></button>";

        // Event listener for the button
        buttonDiv.addEventListener("click", async () => {
            
            // Add spinning animation
            const icon = buttonDiv.querySelector('i');
            icon.classList.add('spinning');
            
            await updateBusesAndStops();

            if (!viewAllBuses) {
                updateRefreshTime();
            }

            // Remove spinning class 
            setTimeout(() => {
                icon.classList.remove('spinning');
            }, 1000);
        });
        return buttonDiv;
    };
    // Add to map
    refreshButton.addTo(map);
}

// ------------------ Function to add location button to the map ------------------
function addLocationButtonToMap() {
    // Location button 
    const locationButton = L.control({ position: "topright" });

    locationButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create("div", "map-button");
        buttonDiv.innerHTML = "<button id='location-button'><i class='fa-solid fa-location-crosshairs'></i></i></button>";

        // Event listener for the button
        buttonDiv.addEventListener("click", async () => {
            await getUserLocation();
            const { lat, lng } = getUserCoordinates();
            drawUserLocation(map);
            map.setView([lat, lng], 15);
            map.userHasPanned = false;
        });
        return buttonDiv;
    };

    // Add to map
    locationButton.addTo(map);
}
// ------------------ Function to add route button to the map ------------------
function addrouteButtonToMap(map,stopLng,stopLat) {

    if(currentRouteButton){
        currentRouteButton.remove();
    }

    // route button 
    const routeButton = L.control({ position: "topright" });

    routeButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create("div", "map-button");
        buttonDiv.innerHTML = "<button id='location-button'><i class='fa-solid fa-person-walking'></i></i></button>";

        // Event listener for the button
        buttonDiv.addEventListener("click", async () => {
            removePlannedRoute(map);
            const{lat,lng} = getUserCoordinates();
            const routeData = await getRouteData(stopLat,stopLng,lng,lat);
            const distance = (routeData.totalDistance/1609.344).toFixed(2);
            const duration = Math.round(routeData.totalDuration / 60);
            drawRoute(routeData,distance,duration,map);
        });
        return buttonDiv;
    };

    // Add to map
    routeButton.addTo(map);
    currentRouteButton = routeButton;
}
// ------------------ Function to layer to style the map ------------------
function addTileLayer(mapInstance) {
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
    }).addTo(mapInstance);
}

// ------------------ Helper function to adjust the map view to the newly drawn route ------------------
function adjustMapViewToRoute(route) {
    if (route) {
        map.fitBounds(route.getBounds());
    }
}

// ------------------ Function to get the map viewport bounds ------------------
function getViewportBounds() {
    // Gets the current bounds of the map
    const bounds = map.getBounds();
    const southwest = bounds.getSouthWest();
    const northeast = bounds.getNorthEast(); 

    // Extracts coordinates
    const minX = southwest.lng;
    const minY = southwest.lat;
    const maxX = northeast.lng;
    const maxY = northeast.lat;
    
    return { minX, minY, maxX, maxY };
}

// ------------------ Function to get the map coordinates ------------------
function getCenterCoordinates() {
    //console.log("here")
    const center = map.getCenter(); 
    if (center) {
        const lat = center.lat;  
        const lng = center.lng;  
        const centerCoords = { lat, lng };
        return centerCoords;
    } else {
        console.error("Map center is undefined");
    }
}

// ------------------ Function to reset inactivity timeout ------------------
function resetInactivityTimeout() {
    // Clear the existing timeout
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    
    // Set a new timeout only if zoom level is appropriate
    if (map.currentZoom >= MIN_BUS_ZOOM) {
        function reload() {
            updateBusesAndStops();
            const stopId = getUrlParameter("stop");
            console.log("STOP ID:", stopId);
            if (stopId) {
                const { lat, lon } = getUserCoordinates()
                loadStopTimes(stopId, lat, lon, map);
            }
        }
        inactivityTimeout = setTimeout(reload, 10000);
    }
}

// ------------------ Function to set view all buses flag ------------------
function setViewAllBuses(value, nocCode, selectedRoute) {
    viewAllBuses = value;
    noc = nocCode || null;
    route = selectedRoute || null;
}

// ------------------ Function to get view all buses flag ------------------
function getViewAllBuses() {
    return viewAllBuses;
}

// ------------------ Function to update buses based on current state ------------------
async function updateBuses() {
    // Prevent multiple simultaneous updates
    if (busUpdateInProgress) return;
    busUpdateInProgress = true;
    
    try {
        // Only check zoom level if viewing all buses
        if (viewAllBuses && map.currentZoom < MIN_BUS_ZOOM) {
            // Clear buses if zoom level is too low and we're viewing all buses
            drawBus(null, map);
            showNotification("Zoom in to view buses", "info");
            busUpdateInProgress = false;
            return;
        }

        const { minX, minY, maxX, maxY } = getViewportBounds();
        //console.log(minX, minY, maxX, maxY)

        if (viewAllBuses) {
            // Show all buses in viewport
            const busData = await getAllBusGPS(maxY, maxX, minY, minX);
            drawBus(busData, map);
        } else if (noc && route) {
            // Try to get buses for specific route and operator
            try {
                const busData = await getSpecificBusGPS(route, true);
                drawBus(busData, map);
            } catch (error) {
                // Fallback to filtering all buses
                //console.log("Falling back to filtered buses kuhgihokgfihufaAHKJFL:", error);
                // const allBuses = await getAllBusGPS(maxY, maxX, minY, minX);
                // const filteredBuses = getFilteredBuses(allBuses, route);
                // drawBus(filteredBuses, map);
            }
        } else if (getNocCode() && getRouteNumber()) {
            // Use stored noc and route from busGps.js
            try {
                const busData = await getSpecificBusGPS(getRouteNumber(), true);
                drawBus(busData, map);
            } catch (error) {
                // Fallback to filtering all buses
                //console.log("Falling back to filtered buses:", error);
                const allBuses = await getAllBusGPS(maxY, maxX, minY, minX);
                const filteredBuses = getFilteredBuses(allBuses, getRouteNumber());
                drawBus(filteredBuses, map);
            }
        }
    } catch (error) {
        console.error("Error updating buses:", error);
        showNotification("Error updating buses", "error");
    } finally {
        busUpdateInProgress = false;
    }
}

// ------------------ Function to update stops based on current state ------------------
async function updateStops() {
    // Check zoom level first
    if (map.currentZoom < MIN_STOP_ZOOM) {
        // Clear stops if zoom level is too low
        drawStops(null, map);
        return;
    }
    
    const { minX, minY, maxX, maxY } = getViewportBounds();
    
    try {
        const stopsInViewport = await fetchStopsInViewport(maxY, maxX, minY, minX);
        drawStops(stopsInViewport, map);
    } catch (error) {
        console.error("Error updating stops:", error);
        showNotification("Error updating stops", "error");
        drawStops(null, map);
    }
}

// ------------------ Function to update both buses and stops ------------------
async function updateBusesAndStops() {
    await updateBuses();
    await updateStops();
}

// ------------------ Function to get URL parameters ------------------
function getUrlParameter(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// ------------------ Function to handle URL changes (browser back/forward) ------------------
async function handlePopState(event) {
    // Check if the URL has a bus parameter
    const busRoute = getUrlParameter("bus");
    
    // If no bus parameter, reset to show all buses
    if (!busRoute) {
        setViewAllBuses(true);
        removeRoute(map);
        $("#bus-data").html("");
        updateBusesAndStops();
        const { lat, lng } = getUserCoordinates();
        map.setView([lat, lng], 15);
    } else {
        // Only proceed if zoom level is appropriate
        if (map.currentZoom >= MIN_BUS_ZOOM) {
            busData = await getSpecificBusGPS(route, false);
            drawBus(busData, map);
        } else {
            showNotification("Please zoom in to view buses", "info");
        }
    }
}

// ------------------ Function to search for bus route ------------------
async function searchRoute(event) {
    event.preventDefault(); 

    let searchInput = document.getElementById("routeSearch");
    let route = searchInput.value; 

    // Remove spaces and convert to uppercase
    route = route.replace(/\s+/g, "").toUpperCase();

    // Update URL without refreshing page
    const newUrl = window.location.origin + window.location.pathname + `?bus=${route}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    searchInput.value = "";

    const busData = await getSpecificBusGPS(route, true, true);
    
    if (busData.length === 0) {
        //console.log("No buses found for this service.");
        showNotification("No live buses found for this route", "info")
        // Remove all URL parameters
        // Update URL without refreshing page
        const newUrl = window.location.origin + window.location.pathname;
        window.history.pushState({ path: newUrl }, "", newUrl);

        setViewAllBuses(true);
        removeRoute(map);
        updateBusesAndStops();
        return;
    }
    

    setViewAllBuses(false, busData[0].noc, route);

    removePlannedRoute(map);
    drawBus(busData, map);

    if (busData[0]) {
        await showSpecificBusRoute(busData[0].serviceId, busData[0].tripId, busData[0].journeyId, route, map, noc, busData[0].direction, busData[0].destination);
    } else {
        // const newUrl = window.location.origin + window.location.pathname;
        // window.history.pushState({ path: newUrl }, "", newUrl);
        showNotification("Route information not available", "warning");
    }
}

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", async function() {
    // Creates map
    map = createMap();
    map.stopCircleRadius = 20;
    map.currentZoom = 15;

    // Adds buttons
    addRefreshButtonToMap(map);
    addHomeButtonToMap(map);
    addLocationButtonToMap(map);

    // Initialize cookie handling
    initializeCookieStorage();
    setupCookieBar();
    
    // Initialize user location tracking
    initUserLocationTracking(map);
    
    // Rest of initialization...
    resetInactivityTimeout();
    updateBusesAndStops();
    

    // Resize the buses as the user zooms in
    map.on("zoom" , function (e) {
        map.currentZoom = e.target._zoom;
        if (map.currentZoom >= 17) {
            map.stopCircleRadius = 10;
        } else if (map.currentZoom >= 13) {
            map.stopCircleRadius = 20;
        } else {
            map.stopCircleRadius = 50;
        }
    });

    // Add event listener for browser back/forward buttons
    window.addEventListener("popstate", handlePopState);

    const routeNumber = getUrlParameter("bus");
    if (routeNumber) {
        //console.log(`Bus route detected in URL: ${routeNumber}`);
        //console.log(lat, lng)
        setViewAllBuses(false);
        //console.log(routeNumber)
        const busData = await getSpecificBusGPS(routeNumber, true, true);
        drawBus(busData, map);
        //console.log(busData)
        await showSpecificBusRoute(busData[0].serviceId, busData[0].tripId, busData[0].journeyId, routeNumber, map, busData[0].noc, busData[0].direction, busData[0].destination);
    }

    // FINISH THIS TO SHOW THE STOP 
    const stopId = getUrlParameter("stop");
    if (stopId) {
        console.log(`Bus stop detected in URL: ${stopId}`);
        const { lat, lng } = getUserCoordinates()
        const busStop = await fetchSpecificStopLocation(stopId, lat, lng);
        map.setView([busStop[0].latitude, busStop[0].longitude], 15);
        loadStopTimes(stopId, busStop[0].latitude, busStop[0].longitude, map);
    }

    // Handle map movement events
    map.on("movestart", function() {
        closePanel();
    });

    map.on("moveend", function() {
        if (ignoreNextMoveEnd) {
            ignoreNextMoveEnd = false;
            return;
        }
        resetInactivityTimeout();
        updateBusesAndStops();
    });
    
    map.on("zoomend", function() {
        if (ignoreNextZoomEnd) {
            ignoreNextZoomEnd = false;
            return;
        }
        resetInactivityTimeout();
        updateBusesAndStops();
    });

    document.getElementById("searchForm").addEventListener("submit", searchRoute);
    
    // Asynchronously get the actual user location
    getUserLocation().then(location => {
        drawUserLocation();
        // Save the new location to cookie
        saveLocationToCookie();
    }).catch(error => {
        console.error("Error getting user location:", error);
    });
    
    initUserLocationTracking();
    
});

// ------------------ Function for easteregg ------------------
function easterEgg() {
    $("#easterEggButton").click(function () {
        const container = $("#easterEggContainer");
        // Clear the container using jQuery
        container.empty(); 

        // Number of images
        const imageCount = 110;

        for (let i = 0; i < imageCount; i++) {
            setTimeout(() => {
                const img = $("<img>");  
                img.attr("src", "images/BusTracker.png");  

                // Random size, position, and rotation
                const randomSize = Math.random() * 80 + 100;
                const randomX = Math.random() * 100;
                const randomY = Math.random() * 100;
                const randomRotation = Math.random() * 360;

                // Set styles 
                img.css({
                    width: `${randomSize}px`,
                    height: `${randomSize}px`,
                    position: "absolute",
                    left: `${randomX}vw`,
                    top: `${randomY}vh`,
                    transform: `rotate(${randomRotation}deg)`
                });

                // Add to the container 
                container.append(img);
            }, i * 100);
        }
    });
}

function removePlannedRoute(map) {
    if (plannedRoute) {
        map.removeLayer(plannedRoute);  
        plannedRoute = null;  
        currentRouteButton.remove();
    }
}

function drawRoute(routeCoords,distance,duration,map) {
    const coordinates = [];
    if (!Array.isArray(routeCoords.coordinates)) {
        console.error("Invalid routeCoords format:", routeCoords);
        return;
    }
    routeCoords.coordinates.forEach((point) => {
        console.log(point.latitude, point.longitude);
        coordinates.push([point.latitude, point.longitude]);
    });
    

    if (!map) {
        console.error("Map is not initialized!");
        return;
    }

  
    if (coordinates.length === 0) {
        console.error("Invalid route coordinates:", coordinates);
        return;
    }

    removePlannedRoute(map);

    plannedRoute = L.polyline(coordinates, {
        color: "#3498db",
        weight: 4,
        opacity: 0.8,
    }).addTo(map);

    const toolTipContent = `
            <div>
                 <p>Walk Time:</strong> ${duration} mins <br>
                 Distance:</strong> ${distance} miles </p>
            </div>
        `;
        plannedRoute.bindTooltip(toolTipContent, { permanent: false, direction: "top", offset: [0, -12] });

        // makes the tooltip permanent when clicked on
        plannedRoute.on("hover", (event) => {
            // stop tooltip
            map.stopMarkers.forEach(marker => {
                marker.closeTooltip();
                
            });
            plannedRoute.openTooltip();
        
        });

    adjustMapViewToRoute(plannedRoute, map);

    return plannedRoute;
}

// Export
export { setViewAllBuses, getViewAllBuses, getViewportBounds, adjustMapViewToRoute, updateBusesAndStops, addrouteButtonToMap,  removePlannedRoute};