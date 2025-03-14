/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

// Modules
import { getAllBusGPS, getSpecificBusGPS, findBus, drawBus, getNocCode, getRouteNumber, getFilteredBuses } from "./busGps.js";
import { fetchStopsInViewport, drawStops } from "./stops.js";
import { removeRoute } from "./busRoute.js";
import { showNotification } from "./helper.js";

// Variables
let map;  
let inactivityTimeout;
let userLocation = null;
let userLat;
let userLng;
let viewAllBuses = true;
let noc = null;
let route = null;
let busUpdateInProgress = false;
let ignoreNextMoveEnd = false;
let ignoreNextZoomEnd = false;

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
    mapInstance.setView([57.1497, -2.0943], 13); // Aberdeen
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
            // Reset to show all buses when the button is clicked
            await getuserLocation();
            drawUserLocation();
            map.setView([userLat, userLng], map.getZoom());
            saveLocationToCookie();
            
            // Set flag to indicate all buses are shown
            setViewAllBuses(true);
            
            // Update the UI
            removeRoute(map);
            updateBusesAndStops();
            
            // Clear bus data container
            $("#bus-data").html("");

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
            updateBusesAndStops();

            // Update timestamp if viewing specific route
            if (!viewAllBuses) {
                updateRefreshTime();
            }
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
            await getuserLocation();
            drawUserLocation();
            map.setView([userLat, userLng], map.getZoom());
            saveLocationToCookie();
        });
        return buttonDiv;
    };

    // Add to map
    locationButton.addTo(map);
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
    const center = map.getCenter(); // Returns a LatLng object in Leaflet
    if (center) {
        const lat = center.lat;  // Access lat directly
        const lng = center.lng;  // Access lng directly
        console.log('Latitude:', lat);
        console.log('Longitude:', lng);
        const centerCoords = { lat, lng };
        return centerCoords;
    } else {
        console.error('Map center is undefined');
    }
}

// ------------------ Function to set default user location ------------------
function setDefaultUserLocation() { 
    // First try to load from cookie
    if (!loadLocationFromCookie()) {
        // Fall back to hardcoded default if cookie doesn't exist
        userLat = 57.14912368784818;
        userLng = -2.0980214518088967;
    }
}

// ------------------ Function to get the users location ------------------
function getuserLocation() {
    return new Promise((resolve, reject) => {
        // Set default location first
        setDefaultUserLocation();
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    userLat = position.coords.latitude;
                    userLng = position.coords.longitude;
                    resolve({ lat: userLat, lng: userLng });
                },
                error => {
                    console.error("Geolocation error:", error);
                    resolve({ lat: userLat, lng: userLng });
                },
                { maximumAge: 60000, timeout: 10000, enableHighAccuracy: true }
            );
        } else {
            // If geolocation not supported, resolve with default
            resolve({ lat: userLat, lng: userLng });
        }
    });
}

// ------------------ Function to draw the users location ------------------
async function drawUserLocation() {
    // Draw icon
    const userIcon = L.divIcon({
        className: "user-location-marker",
        iconSize: [18, 18],
    });
    
    // Remove the existing marker if it exists
    if (userLocation) {
        map.removeLayer(userLocation);
    }
    
    // Add the new marker with the custom icon
    userLocation = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
}

// ------------------ Functions to set the cookie ------------------
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
}

// ------------------ Functions to get the cookie ------------------
function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// ------------------ Function to save user's location to cookie ------------------
function saveLocationToCookie() {
    if (userLat && userLng) {
        // Store lat and lng as string with 6 decimal places precision
        const locationString = `${userLat.toFixed(6)},${userLng.toFixed(6)}`;
        setCookie('lastUserLocation', locationString, 30); // Store for 30 days
    }
}

// ------------------ Function to load user's location from cookie ------------------
function loadLocationFromCookie() {
    const savedLocation = getCookie('lastUserLocation');
    if (savedLocation) {
        const [lat, lng] = savedLocation.split(',').map(coord => parseFloat(coord));
        if (!isNaN(lat) && !isNaN(lng)) {
            userLat = lat;
            userLng = lng;
            return true;
        }
    }
    return false;
}

// ------------------ Function to handle user location tracking ------------------
async function initUserLocationTracking() {
    // First try to load location from cookie
    setDefaultUserLocation();
    
    // Draw with saved/default location immediately
    drawUserLocation();
    
    // Try to load map view from cookie and center the map
    map.setView([userLat, userLng], map.getZoom());
    
    // Then try to get actual location and update
    try {
        await getuserLocation();
        drawUserLocation();
        
        map.setView([userLat, userLng], map.getZoom());
        
        // Save the new location to cookie
        saveLocationToCookie();
    } catch (error) {
        console.error("Error getting user location:", error);
    }
    
    // Set up interval to refresh location every 30 seconds
    setInterval(async () => {
        await getuserLocation();
        drawUserLocation();
        saveLocationToCookie();
    }, 30000);
    
    // Set up listener for device movement (if supported)
    if (navigator.geolocation && 'watchPosition' in navigator.geolocation) {
        navigator.geolocation.watchPosition(
            position => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                drawUserLocation();
                saveLocationToCookie();
            },
            error => {
                console.error("Watch position error:", error);
            },
            { enableHighAccuracy: true, maximumAge: 30000 }
        );
    }
    
    // Save location when map is moved or zoomed
    map.on("moveend", function() {
        if (!ignoreNextMoveEnd) {
            saveLocationToCookie();
        }
    });
    
    map.on("zoomend", function() {
        if (!ignoreNextZoomEnd) {
            saveLocationToCookie();
        }
    });
}

// ------------------ Function to reset inactivity timeout ------------------
function resetInactivityTimeout() {
    // Clear the existing timeout
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    
    // Set a new timeout only if zoom level is appropriate
    if (map.currentZoom >= MIN_BUS_ZOOM) {
        inactivityTimeout = setTimeout(updateBusesAndStops, 10000);
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

        if (viewAllBuses) {
            // Show all buses in viewport
            const busData = await getAllBusGPS(maxY, maxX, minY, minX);
            drawBus(busData, map);
        } else if (noc && route) {
            // Try to get buses for specific route and operator
            try {
                const busData = await getSpecificBusGPS(noc, route);
                drawBus(busData, map);
            } catch (error) {
                // Fallback to filtering all buses
                console.log("Falling back to filtered buses:", error);
                const allBuses = await getAllBusGPS(maxY, maxX, minY, minX);
                const filteredBuses = getFilteredBuses(allBuses, route);
                drawBus(filteredBuses, map);
            }
        } else if (getNocCode() && getRouteNumber()) {
            // Use stored noc and route from busGps.js
            try {
                const busData = await getSpecificBusGPS(getNocCode(), getRouteNumber());
                drawBus(busData, map);
            } catch (error) {
                // Fallback to filtering all buses
                console.log("Falling back to filtered buses:", error);
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
    } else {
        // Only proceed if zoom level is appropriate
        if (map.currentZoom >= MIN_BUS_ZOOM) {
            // If there is a bus parameter, show that specific bus
            findBus(busRoute.toUpperCase(), userLat, userLng);
        } else {
            showNotification("Please zoom in to view buses", "info");
        }
    }
}

function searchRoute(event) {
    event.preventDefault(); 

    let searchInput = document.getElementById("routeSearch");
    let route = searchInput.value; 

    // Remove spaces and convert to uppercase
    route = route.replace(/\s+/g, "").toUpperCase();

    // Update URL without refreshing page
    const newUrl = window.location.origin + window.location.pathname + `?bus=${route}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    searchInput.value = "";
    const { lat, lng } = getCenterCoordinates();
    console.log(lat)
    console.log(lng)
    findBus(route, lat, lng, map);
}

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", async function() {
    // Creates map
    map = createMap();
    map.stopCircleRadius = 50;
    map.currentZoom = 13;

    // Adds buttons
    addRefreshButtonToMap(map);
    addHomeButtonToMap(map);
    addLocationButtonToMap(map);

    // Initialise user location tracking
    initUserLocationTracking();

    await getuserLocation();
    drawUserLocation();
    map.setView([userLat, userLng], map.getZoom());

    resetInactivityTimeout();

    resetInactivityTimeout();

    // Initial update of buses and stops
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
        console.log(`Bus route detected in URL: ${routeNumber}`);
        await findBus(routeNumber.toUpperCase(), userLat, userLng, map);
    }

    // Handle map movement events
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

// Export
export { setViewAllBuses, getViewAllBuses, getViewportBounds, adjustMapViewToRoute, updateBusesAndStops };