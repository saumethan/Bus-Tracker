/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

// Constants
//const TRANSIT_API_KEY = "5b47ee0c0046d256e34d4448e229970472dc74e24ab240188c51e12192e2cd74";
//const BUS_PROXY = `https://europe-west2-legendoj1-portfolio.cloudfunctions.net/busproxy/?apiKey=${TRANSIT_API_KEY}&url=`;
const LIVE_TIMES_URL = "https://apim-public-trs.trapezegroupazure.co.uk/trs/lts/lts/v1/public/departures";
const LIVE_TIMES_KEY = "3918fe2ad7e84a6c8108b305612a8eb3";

// Variables
let map;  
let route; 
let gpsRoute;
let nocCode;
let viewAllBuses = true;
let radius = 50;
let inactivityTimeout;
let userLocation;
let userLat;
let userLng;
let transitStopIds = {};
let htmlContent = "";
let busRouteNotFound = false;

// Initialize the map and set its location
function createMap() {
    const mapInstance = L.map('map').setView([57.1497, -2.0943], 13); // Aberdeen
    addTileLayer(mapInstance); 
    return mapInstance;
}

// ------------------ Function to add refresh button to the map ------------------
function addRefreshButtonToMap(mapInstance) {
    // Refresh buses 
    const refreshButton = L.control({ position: 'topright' });

    refreshButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="reset-button"><i class="fa-solid fa-arrows-rotate"></i></button>';

        // Event listener for the button
        buttonDiv.addEventListener('click', () => {

            // Refresh viewport to load all buses
            updateViewportBounds();

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
    refreshButton.addTo(mapInstance);
}

// ------------------ Function to add home button to the map ------------------
function addHomeButtonToMap(mapInstance) {
    // Home button 
    const homeButton = L.control({ position: 'topleft' });

    homeButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="home-button"><i class="fa-solid fa-house"></i></button>';

        // Event listener for the button
        buttonDiv.addEventListener('click', () => {
            // Reset to show all buses when the button is clicked
            viewAllBuses = true;

            busRouteNotFound = false;

            if (route) {
                map.removeLayer(route);
                route = null;
            }

            if (viewAllBuses == false) {
                if (map.busMarkers) {
                    map.busMarkers.forEach(marker => map.removeLayer(marker));
                }
            }

            // Refresh viewport to load all buses
            updateViewportBounds();
    
            // append html to DOM
            $("#bus-data").html("");

        });
        return buttonDiv;
    };

    // Add to map
    homeButton.addTo(mapInstance);
}

// ------------------ Function to add location button to the map ------------------
function addLocationButtonToMap(mapInstance) {
    // Location button 
    const locationButton = L.control({ position: 'topright' });

    locationButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="location-button"><i class="fa-solid fa-location-crosshairs"></i></i></button>';

        // Event listener for the button
        buttonDiv.addEventListener('click', () => {

            showUserLocation();

            // Refresh viewport to load all buses
            updateViewportBounds();

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
    locationButton.addTo(mapInstance);
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
function updateViewportBounds() {
    
    // Gets the current bounds of the map
    let bounds = map.getBounds();
    let southwest = bounds.getSouthWest();
    let northeast = bounds.getNorthEast(); 

    // Extracts coordinates
    let minX = southwest.lng;
    let minY = southwest.lat;
    let maxX = northeast.lng;
    let maxY = northeast.lat;
}

// ------------------ Function to show the users location ------------------
function showUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

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
            }, 
        error => {
            console.error("Geolocation error:", error);
            map.setView([userLat, userLng]);
        });
    } 
}

// ------------------ Function to reset inactivity timeout ------------------
function resetInactivityTimeout() {
    // Clear the existing timeout
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    // Set a new timeout 
    inactivityTimeout = setTimeout(updateViewportBounds, 15000);
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
            radius = 10;
        } else if (map.currentZoom >= 13) {
            radius = 20;
        } else {
            radius = 50;
        }
    });

    // UpdateViewportBounds after 15s of inactivity
    map.on("move", resetInactivityTimeout);
    map.on("zoom", resetInactivityTimeout);
});