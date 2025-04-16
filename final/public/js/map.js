/**
 * @author Ethan Saum @saumethan
 * @author Owen Meade @owenrgu
 * @author Xavier Flockton @XavierFlockton
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

// Modules
import { getAllBusGPS, getSpecificBusGPS, drawBus, getNocCode, getRouteNumber, showSpecificBusRoute } from "./busGps.js";
import { fetchStopsInViewport, drawStops, loadStopTimes, fetchSpecificStopLocation } from "./stops.js";
import { removeRoute } from "./busRoute.js";
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
let lastRequestedBounds = null;
let initialZoom
let isKM = false;
let currentRouteButton = null;

// Constants for zoom levels
const MIN_BUS_ZOOM = 12;
const MIN_STOP_ZOOM = 15;

// Initialize the map and set its location
async function createMap() {
    const center = [57.1497, -2.0943]; // Aberdeen
    initialZoom = 15; // Default zoom

    const mapInstance = L.map("map", {
        zoomControl: false,
        doubleTapDragZoom: "center",
        doubleTapDragZoomOptions: { reverse: true }
    });

    try {
        const data = await $.get("settings/userSettings");
    
        if (data.zoomLevel !== undefined && !isNaN(data.zoomLevel)) {
            initialZoom = data.zoomLevel;
        }
    } catch (err) {
        mapInstance.zoomLevel = 15;
        console.error("Failed to load user settings:", err);
    }
    
    mapInstance.setView(center, initialZoom);
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
            updateBusesAndStops();
            
            // Clear bus data container
            $("#bus-data").html("");
            closePanel();

            // Remove all URL parameters
            // Update URL without refreshing page
            const newUrl = window.location.origin + window.location.pathname;
            window.history.pushState({ path: newUrl }, "", newUrl);

            removePlannedRoute(map);
            if (currentRouteButton) {
                currentRouteButton.remove();
            }
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
            const icon = buttonDiv.querySelector("i");
            icon.classList.add("spinning");
            
            await updateBusesAndStops();

            if (!viewAllBuses) {
                updateRefreshTime();
            }

            // Remove spinning class 
            setTimeout(() => {
                icon.classList.remove("spinning");
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
    const bounds = map.getBounds();
    const southwest = bounds.getSouthWest();
    const northeast = bounds.getNorthEast();
    return { minX: southwest.lng, minY: southwest.lat, maxX: northeast.lng, maxY: northeast.lat };
}

// ------------------ Function to get the map coordinates ------------------
function getCenterCoordinates() {
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
        inactivityTimeout = setTimeout(() => {
            updateBusesAndStops();
            const stopId = getUrlParameter("stop");
            if (stopId) {
                const { lat, lon } = getUserCoordinates();
                loadStopTimes(stopId, lat, lon, map);
            }
        }, 15000);
    }
}

// ------------------ Function to check if the viewport has moved beyond the last bounds ------------------
function hasMovedBeyondBounds(newBounds) {
    if (!lastRequestedBounds) return true;
    return (
        newBounds.minX < lastRequestedBounds.minX ||
        newBounds.maxX > lastRequestedBounds.maxX ||
        newBounds.minY < lastRequestedBounds.minY ||
        newBounds.maxY > lastRequestedBounds.maxY
    );
}

// ------------------ Function to set view all buses flag ------------------
function setViewAllBuses(value, nocCode, selectedRoute) {
    viewAllBuses = value;
    noc = nocCode || null;
    route = selectedRoute || null;

    document.dispatchEvent(new CustomEvent("viewAllBusesChanged", { detail: { viewAllBuses } }));
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
            busUpdateInProgress = false;
            return;
        }

        const { minX, minY, maxX, maxY } = getViewportBounds();

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
                console.error(error);
            }
        } else if (getNocCode() && getRouteNumber()) {
            // Use stored noc and route from busGps.js
            try {
                const busData = await getSpecificBusGPS(getRouteNumber(), true);
                drawBus(busData, map);
            } catch (error) {
                console.error("Falling back to filtered buses:", error);
            }
        }
    } catch (error) {
        console.error("Error updating buses:", error);
    } finally {
        busUpdateInProgress = false;
    }
}

// ------------------ Function to update stops based on current state ------------------
async function updateStops() {
    // Check zoom level first
    if (map.currentZoom < MIN_STOP_ZOOM) {
        // Don't draw stops if zoom level is too low (below 15)
        drawStops(null, map);
        return;
    }

    const { minX, minY, maxX, maxY } = getViewportBounds();
    
    try {
        const stopsInViewport = await fetchStopsInViewport(maxY, maxX, minY, minX);
        drawStops(stopsInViewport, map);
    } catch (error) {
        console.error("Error updating stops:", error);
        drawStops(null, map);  // Clear stops if there's an error
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

    drawBus(busData, map);

    if (busData[0]) {
        await showSpecificBusRoute(busData[0].serviceId, busData[0].tripId, busData[0].journeyId, route, map, noc, busData[0].direction, busData[0].destination);
    }
}

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", async function() {
    // Creates map
    map = await createMap();
    map.stopCircleRadius = 20;
    map.currentZoom = initialZoom;

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

    // Gets the route number from the URL 
    const routeNumber = getUrlParameter("bus");
    if (routeNumber) {
        setViewAllBuses(false);
        const busData = await getSpecificBusGPS(routeNumber, true, true);
        drawBus(busData, map);
        await showSpecificBusRoute(busData[0].serviceId, busData[0].tripId, busData[0].journeyId, routeNumber, map, busData[0].noc, busData[0].direction, busData[0].destination);
    }

    // Gets the stop id from the URL 
    const stopId = getUrlParameter("stop");
    if (stopId) {
        const { lat, lng } = getUserCoordinates()
        const busStop = await fetchSpecificStopLocation(stopId, lat, lng);
        map.setView([busStop[0].latitude, busStop[0].longitude], 15);
        loadStopTimes(stopId, busStop[0].latitude, busStop[0].longitude, map);
        updateBusesAndStops();
    }

    // Handle map movement events
    map.on("dragstart", function() {
        closePanel();
    });

    map.on("moveend", function () {
        updateBusesAndStops();
        resetInactivityTimeout();
    });
    
    map.on("zoomend", function () {
        updateBusesAndStops();
        resetInactivityTimeout();

        document.dispatchEvent(new CustomEvent("zoomedOut", { detail: { zoom: map.currentZoom } }));
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

function removeRouteButton(){
    currentRouteButton.remove();
}

function removePlannedRoute(map) {
    if (plannedRoute) {
        map.removeLayer(plannedRoute);  
        plannedRoute = null;  
        currentRouteButton.remove();
    }
}

async function drawRoute(routeCoords,distance,duration,map) {

    let units;

    try {
        const data = await $.get("settings/userUnitsSettings");
        if (data.isKM !== undefined) {
            isKM = data.isKM;
        }
    } catch (err) {
        isKM = false;

    }

    if (isKM){
        distance *= 1.60934;
        units = "KM";
    }else{
        units = "Miles";
    }

    const coordinates = [];
    if (!Array.isArray(routeCoords.coordinates)) {
        console.error("Invalid routeCoords format:", routeCoords);
        return;
    }
    routeCoords.coordinates.forEach((point) => {
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
        color: "#0000A0",
        weight: 4,
        opacity: 0.8,
    }).addTo(map);

    const toolTipContent = `
            <div>
                <p>Walk Time:</strong> ${duration} mins <br>
                Distance:</strong> ${Number(distance).toFixed(2)} ${units} </p>
            </div>
        `;
        plannedRoute.bindTooltip(toolTipContent, { permanent: true, direction: "top", offset: [0, -12] });

    adjustMapViewToRoute(plannedRoute, map);

    return plannedRoute;
}

// Export
export { setViewAllBuses, getViewAllBuses, getViewportBounds, adjustMapViewToRoute, updateBusesAndStops, addrouteButtonToMap, removePlannedRoute,removeRouteButton};