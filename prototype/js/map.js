/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

// Modules
import { fetchStopsInViewport, drawStops } from "./stops.js";
import { removeRoute } from "./busRoute.js";
import { getAllBusGPS, getSpecificBusGPS, drawBus, getNocCode, getGpsRoute } from "./busGps.js";

// Variables
let map;  
let inactivityTimeout;
let userLocation;
let userLat;
let userLng;
let viewAllBuses = true;

// Initialize the map and set its location
function createMap() {
    const mapInstance = L.map('map').setView([57.1497, -2.0943], 13); // Aberdeen
    addTileLayer(mapInstance); 
    return mapInstance;
}

// ------------------ Function to add refresh button to the map ------------------
function addRefreshButtonToMap() {
    // Refresh buses 
    const refreshButton = L.control({ position: 'topright' });

    refreshButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="reset-button"><i class="fa-solid fa-arrows-rotate"></i></button>';

        // Event listener for the button
        buttonDiv.addEventListener('click', async () => {
            // Refresh viewport to load all buses
            if (map.currentZoom >= 12) {
                var { minX, minY, maxX, maxY } = getViewportBounds();
                var busData = await getAllBusGPS(maxY, maxX, minY, minX)
                drawBus(busData, map);
            }

            // Update the refresh time if a specific bus route is showing 
            if (!viewAllBuses) {
                const now = new Date();
                const formattedTime = now.toLocaleTimeString(); 
                $("#refreshTime").text("Last updated: " + formattedTime);

                }
        });

        return buttonDiv;
    };

    // Add to map
    refreshButton.addTo(map);
}

async function updateBuses() {
    if(viewAllBuses) {
        const { minX, minY, maxX, maxY } = getViewportBounds();
        const busData = await getAllBusGPS(maxY, maxX, minY, minX);
        drawBus(busData, map);
    } else {
        const busData = await getSpecificBusGPS(getNocCode(), getGpsRoute());
        drawBus(busData, map);
    }
}

// ------------------ Function to add home button to the map ------------------
function addHomeButtonToMap() {
    // Home button 
    const homeButton = L.control({ position: 'topleft' });

    homeButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="home-button"><i class="fa-solid fa-house"></i></button>';

        // Event listener for the button
        buttonDiv.addEventListener('click', () => {
            // Reset to show all buses when the button is clicked
            viewAllBuses = true;
            removeRoute(map);
            
            updateBuses();

            showUserLocation(); 
    
            // append html to DOM
            $("#bus-data").html("");

        });
        return buttonDiv;
    };

    // Add to map
    homeButton.addTo(map);
}

// ------------------ Function to add location button to the map ------------------
function addLocationButtonToMap() {
    // Location button 
    const locationButton = L.control({ position: 'topright' });

    locationButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="location-button"><i class="fa-solid fa-location-crosshairs"></i></i></button>';

        // Event listener for the button
        buttonDiv.addEventListener('click', () => {

            showUserLocation();

            // Update the refresh time if a specific bus route is showing 
            if (!viewAllBuses) {
                const now = new Date();
                const formattedTime = now.toLocaleTimeString(); 
                $("#refreshTime").text("Last updated: " + formattedTime);

            }
        });
        return buttonDiv;
    };

    // Add to map
    locationButton.addTo(map);
}

// ------------------ Function to layer to style the map ------------------
function addTileLayer(mapInstance) {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(mapInstance);
}

// ------------------ Helper function to adjust the map view to the newly drawn route ------------------
function adjustMapViewToRoute(route) {
    if (route) {
        map.fitBounds(route.getBounds());
    }
}

// ------------------ Function to update the map viewport ------------------
function getViewportBounds() {
    // Gets the current bounds of the map
    var bounds = map.getBounds();
    var southwest = bounds.getSouthWest();
    var northeast = bounds.getNorthEast(); 

    // Extracts coordinates
    var minX = southwest.lng;
    var minY = southwest.lat;
    var maxX = northeast.lng;
    var maxY = northeast.lat;
    
    return { minX, minY, maxX, maxY };
}

// ------------------ Function to show the users location ------------------
function getUserlocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            return { userLat, userLng };
        },error => {
            console.error("Geolocation error:", error);
            map.setView([userLat, userLng]);
        });
    }
}
function showUserLocation() {

    const { userLat, userLng } = getUserlocation;

    if(userLat && userLng) {
        const userIcon = L.divIcon({
            className: "user-location-marker", 
            iconSize: [18, 18],                
        });
    
        // Remove the existing marker
        if (userLocation) {
            map.removeLayer(userLocation);
            userLocation = null;
        }
        // Add the marker with the custom icon to the map
        const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userLocation = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    
        // Center map on user"s location
        map.setView([userLat, userLng], 13);
    }
}

// ------------------ Function to reset inactivity timeout ------------------
function resetInactivityTimeout() {
    // Clear the existing timeout
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    // Set a new timeout 
    inactivityTimeout = setTimeout(updateBuses, 15000);
}

async function setViewAllBuses(value) {
    
    viewAllBuses = value;
    const { minX, minY, maxX, maxY } = getViewportBounds();

    if(viewAllBuses === false) {
    }
}

function getViewAllBuses() {
    return viewAllBuses;
}


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

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", function() {
    
    // Creates map
    map = createMap();
    map.stopCircleRadius = 50;
    map.currentZoom = 13;

    // Adds buttons
    addRefreshButtonToMap(map);
    addHomeButtonToMap(map);
    addLocationButtonToMap(map);

    showUserLocation()
    resetInactivityTimeout();

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

    // Update stops and buses when the map is moved/zoomed
    async function onMapMoved() {
        resetInactivityTimeout();

        const { minX, minY, maxX, maxY } = getViewportBounds();
        if(viewAllBuses) {
            // handle stop displays
            if (map.currentZoom >= 15) {
                const stopsInViewport = await fetchStopsInViewport(maxY, maxX, minY, minX);
                drawStops(stopsInViewport, map);
            } else {
                drawStops(null, map); // hide the stops
            }
            
            // buses stop displays
            if (map.currentZoom >= 12) {
                const busData = await getAllBusGPS(maxY, maxX, minY, minX)
                drawBus(busData, map);
            } else {
                drawBus(null, map);
            }
        } else {
            // EDIT TO DRAW STOPS FOR THE SELECTED ROUTE
            if (map.currentZoom >= 15) {
                const stopsInViewport = await fetchStopsInViewport(maxY, maxX, minY, minX);
                drawStops(stopsInViewport, map);
            } else {
                drawStops(null, map); // hide the stops
            }

            // Redraws the buses for a specific route
            updateBuses();
        }
    }

    map.on("moveend", onMapMoved);
    map.on("zoomend", onMapMoved);
});


// Export
export { setViewAllBuses, getViewAllBuses };