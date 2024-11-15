/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @version 1.0
 * @description Bus Tracker
 */

// Variables
let map;  
let route; 
let gpsRoute = "X8";
let nocCode = "SBLB";
let viewAllBuses = true;
let radius = 50;
let currentZoom = 13;
let inactivityTimeout;
let userLocation;
let userLat;
let userLng;

// Initialize the map and set its location
function createMap() {
    const mapInstance = L.map('map').setView([57.1497, -2.0943], 13); // Aberdeen
    addTileLayer(mapInstance); 
    return mapInstance;
}

// Function to add refresh button to the map
function addRefreshButtonToMap(mapInstance) {
    // refresh buses 
    const refreshButton = L.control({ position: 'topright' });

    refreshButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="resetButton"><i class="fa-solid fa-arrows-rotate"></i></button>';

        // event listener for the button
        buttonDiv.addEventListener('click', () => {

            // Refresh viewport to load all buses
            updateViewportBounds();

            // Update the refresh time if a specific bus route is showing 
            if (!viewAllBuses) {
                const now = new Date();
                const formattedTime = now.toLocaleTimeString(); 
                document.getElementById("refreshTime").textContent = "Last updated: " + formattedTime;
                }
        });

        return buttonDiv;
    };

    refreshButton.addTo(mapInstance);
}
// Function to add home button to the map
function addHomeButtonToMap(mapInstance) {
    // Home button 
    const homeButton = L.control({ position: 'topleft' });

    homeButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="homeButton"><i class="fa-solid fa-house"></i></button>';

        // event listener for the button
        buttonDiv.addEventListener('click', () => {
            // Reset to show all buses when the button is clicked
            viewAllBuses = true;

            if (route) {
                map.removeLayer(route);
                route = null;
            }

            if (viewAllBuses == false) {
                if (map.busMarkers) {
                    map.busMarkers.forEach(marker => map.removeLayer(marker));
                }
            }
            

            getUserLocation(true);
            map.setView([userLat, userLng]);

            // Refresh viewport to load all buses
            updateViewportBounds();

            // Remove the route and destination info
            document.getElementById("busRoute").textContent = "";
            document.getElementById("busDestination").textContent = "";

            // Remove the refresh time
            const now = new Date();
            const formattedTime = now.toLocaleTimeString(); 
            document.getElementById("refreshTime").textContent = "";
        });
        return buttonDiv;
    };
    homeButton.addTo(mapInstance);
}
// Function to add location button to the map
function addLocationButtonToMap(mapInstance) {
    // Location button 
    const locationButton = L.control({ position: 'topright' });

    locationButton.onAdd = function () {
        const buttonDiv = L.DomUtil.create('div', 'map-button');
        buttonDiv.innerHTML = '<button id="locationButton"><i class="fa-solid fa-location-crosshairs"></i></i></button>';

        // event listener for the button
        buttonDiv.addEventListener('click', () => {

            getUserLocation(false);
            map.setView([userLat, userLng]);

            // Refresh viewport to load all buses
            updateViewportBounds();

            // Update the refresh time if a specific bus route is showing 
            if (!viewAllBuses) {
                const now = new Date();
                const formattedTime = now.toLocaleTimeString(); 
                document.getElementById("refreshTime").textContent = "Last updated: " + formattedTime;
            }
        });
        return buttonDiv;
    };
    locationButton.addTo(mapInstance);
}


// Layer to style the map
function addTileLayer(mapInstance) {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(mapInstance);
}

function addRoute(id) {
    // URL to get the route data
    const url = `https://bustimes.org/api/trips/${id}/?format=json`;

    $.getJSON(url, data => {
        // array for  coords
        const routeCoords = [];

        // Extracts coordinates from  data
        data.times.forEach(stop => {
            if (stop.track) {
                stop.track.forEach(coord => {
                    routeCoords.push([coord[1], coord[0]]);
                });
            }
        });

        // Remove the existing route if it exists
        if (typeof route !== 'undefined' && route) {
            map.removeLayer(route); 
        }

        // Add the new route to the map using Leaflet's polyline
        route = L.polyline(routeCoords, {
            color: '#3498db', 
            weight: 4,
            opacity: 0.8,
        }).addTo(map);

        // Adjust the map view to fit the new route
        adjustMapViewToRoute(route);
    });
}

// Fit the map to the route
function adjustMapViewToRoute(routeLayer) {
    map.fitBounds(routeLayer.getBounds());
}

// Get the bus data for a specific bus route
function getSpecificBusGPS(nocCode, route) {
    const url = `https://bustimes.org/vehicles.json?operator=${nocCode}`;

    $.getJSON(url, data => {
        // Filter data for the bus route
        const filteredBuses = data.filter(bus => bus.service.line_name === route);

        // get the longitude and latitude
        const busData = filteredBuses.map(bus => ({
            longitude: bus.coordinates[0],
            latitude: bus.coordinates[1],
            route: bus.service.line_name,
            destination: bus.destination
        }));

        drawBus(busData, map);
    });
}

// Get the bus data for all bus routes in viewport 
function getAllBusGPS(yMax, xMax, yMin, xMin) {
    // don't show buses when zoomed far out
    if (currentZoom < 12) {
        if (map.busMarkers) {
            map.busMarkers.forEach(marker => {
                map.removeLayer(marker);
            });
        }
        return;
    }

    // get the bus GPS locations
    const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;

    $.getJSON(url, function(data) {
        // gets the longitude and latitude
        const busData = data.map(bus => ({
            longitude: bus.coordinates[0],
            latitude: bus.coordinates[1],
            route: bus.service.line_name,
            destination: bus.destination,
            id: bus.trip_id
        }));

        drawBus(busData, map);
    });
}

function drawBus(busData, map) {
    // Remove existing bus markers
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }

    map.busMarkers = [];

    // Draw each bus marker
    busData.forEach(coord => {
        const { longitude, latitude, route, destination, id } = coord; // Ensure `id` is present

        const circle = L.circle([latitude, longitude], {
            color: 'red', 
            fillColor: '#f03', 
            fillOpacity: 0.5,
            radius: radius
        }).addTo(map);

        const toolTipContent = ` 
            <div>
                <strong>Route: ${route}</strong><br>
                Destination: ${destination}<br>
            </div>
        `;

        circle.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });

        // Add click event listener to the bus marker
        circle.on('click', (event) => {
            gpsRoute = route;
            viewAllBuses = false;

            refreshSpecificBusRoute(id); 

            // Reset tooltips on all markers
            map.busMarkers.forEach(marker => {
                marker.closeTooltip(); 
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
            });

            // Make clicked bus's tooltip permanent
            circle.bindTooltip(toolTipContent, { permanent: true, direction: 'top' }).openTooltip();

            // Update the route and destination info
            document.getElementById("busRoute").textContent = "Route: " + route;
            document.getElementById("busDestination").textContent = "Destination: " + destination;

            // Update the refresh time
            const now = new Date();
            const formattedTime = now.toLocaleTimeString(); 
            document.getElementById("refreshTime").textContent = "Last updated: " + formattedTime;
        });

        map.busMarkers.push(circle);
    });

    // Close tooltips when clicking elsewhere on the map
    map.on('click', () => {
        map.busMarkers.forEach(marker => {
            marker.closeTooltip();
            marker.unbindTooltip();
        });
    });
}


// Function to update map with specific bus route
function refreshSpecificBusRoute(busId) { 
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => map.removeLayer(marker));
    }
    if (route) {
        map.removeLayer(route);
    }

    // Fetch and draw the selected route and bus data
    addRoute(busId); 
    getSpecificBusGPS(nocCode, gpsRoute);
}

// Get the stops in the viewport
function getStopsInViewport(yMax, xMax, yMin, xMin) {
    // don't show stops when zoomed far out
    if (currentZoom < 15) {
        if (map.stopMarkers) {
            map.stopMarkers.forEach(marker => {
                map.removeLayer(marker);
            });
        }
        return;
    }

    // get nearby stops
    const url = `https://bustimes.org/stops.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;
    $.getJSON(url, function(data) {
        // parse the stop data into a better format
        const stopsData = data.features.map(stop => ({
            longitude: stop.geometry.coordinates[0],
            latitude: stop.geometry.coordinates[1],
            services: stop.properties.services,
            id: stop.properties.url.split("/")[2],
            name: stop.properties.name
        }));

        // plot all bus stops in the viewport
        drawStops(stopsData, map);
    });
}

// Draw stops on the map
function drawStops(stopsData, map) {
    // remove existing stop markers
    if (map.stopMarkers) {
        map.stopMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }

    // plot a circle for each bus stop
    map.stopMarkers = [];
    stopsData.forEach(stop => {
        // create marker
        const circle = L.circle([stop.latitude, stop.longitude], {
            color: 'blue', 
            fillColor: '#0362fc', 
            fillOpacity: 0.5,
            radius: radius
        }).addTo(map);

        // get services for this stop as a string
        let stopServicesString = "";
        stop.services.forEach(serviceName => {
            stopServicesString += serviceName + ", ";
        });

        if (stopServicesString.length === 0) {
            stopServicesString = "This stop is currently serving no buses";
        } else {
            stopServicesString = stopServicesString.substring(0, stopServicesString.length-2);
        }

        // bind tooltip
        const toolTipContent = `
            <div>
                <strong>Stop: ${stop.name}</strong><br>
                Services: ${stopServicesString}<br>
            </div>
        `;
        circle.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });

        // makes the tooltip permanent when clicked on
        circle.on("click", (event) => {
            map.stopMarkers.forEach(marker => {
                marker.closeTooltip(); // closes any open tooltips
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
            });
            circle.bindTooltip(toolTipContent, { permanent: true, direction: 'top' }).openTooltip();
        });

        map.stopMarkers.push(circle);
    });
}

function updateViewportBounds() {
    // Gets the current bounds of the map
    let bounds = map.getBounds();
    let southwest = bounds.getSouthWest();
    let northeast = bounds.getNorthEast(); 

    // Extract coordinates
    let minX = southwest.lng;
    let minY = southwest.lat;
    let maxX = northeast.lng;
    let maxY = northeast.lat;

    if (viewAllBuses === true) {
        getAllBusGPS(maxY, maxX, minY, minX);
    } else {
        getSpecificBusGPS(nocCode, gpsRoute);
    }
    getStopsInViewport(maxY, maxX, minY, minX);
}

function updateUserLocation(updateView) {
    getUserLocation(() => {
        // Check if location is valid before trying to update the map
        if (userLat && userLng) {
            // Custom user marker icon
            const userIcon = L.divIcon({
                className: "user-location-marker",
                iconSize: [18, 18],
            });

            // Remove the existing marker
            if (userLocation) {
                map.removeLayer(userLocation);
            }

            // Add the new user marker
            userLocation = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

            // If updateView is false, update the map's view to the new user location
            if (!updateView) {
                map.setView([userLat, userLng], currentZoom); 
            }
        } else {
            console.error("Invalid user location data.");
        }
    });
}

function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            if (callback) callback();  
        }, (error) => {
            console.error(`Error fetching geolocation: ${error.message}`);
            if (callback) callback(); 
        });
    }
}


function resetInactivityTimeout() {
    // Clear the existing timeout
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    
    // Set a new timeout 
    inactivityTimeout = setTimeout(updateViewportBounds, 15000);
}

function easterEgg() {
    document.getElementById("easterEggButton").addEventListener("click", function() {
        const container = document.getElementById("easterEggContainer");
        // Cremove existing images
        container.innerHTML = ''; 
    
        // Number of images
        const imageCount = 110;
    
        for (let i = 0; i < imageCount; i++) {
            setTimeout(() => {
                const img = document.createElement("img");
                img.src = "images/BusTracker.png"; 
        
                // Generate random size, position, and rotation
                const randomSize = Math.random() * 80 + 100; 
                const randomX = Math.random() * 100; 
                const randomY = Math.random() * 100; 
                const randomRotation = Math.random() * 360; 
        
                // Apply styles
                img.style.width = `${randomSize}px`;
                img.style.height = `${randomSize}px`;
                img.style.position = 'absolute';
                img.style.left = `${randomX}vw`;
                img.style.top = `${randomY}vh`;
                img.style.transform = `rotate(${randomRotation}deg)`;
        
                // Add to container
                container.appendChild(img);
            }, i * 100); // Delay increases by 500ms for each iteration
        }
        
    });
}

// Calls showUserLocation when the users location moves
// https://www.w3schools.com/html/html5_geolocation.asp
if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
        updateUserLocation,
        (error) => console.error(`Error watching location: ${error.message}`), 
        {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000
        }
    );
}

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", function() {
    map = createMap();
    addRefreshButtonToMap(map);
    addHomeButtonToMap(map);
    addLocationButtonToMap(map);

    if (viewAllBuses === true) {
        map.on('moveend', updateViewportBounds); 
        map.on('zoomend', updateViewportBounds);
    } 

    // Resize the buses as the user zooms in
    map.on("zoom" , function (e) {
        currentZoom = e.target._zoom;
        if (currentZoom >= 17) {
            radius = 10;
        } else if (currentZoom >= 13) {
            radius = 20;
        } else {
            radius = 50;
        }

        if (map.busMarkers) {
            map.busMarkers.forEach(marker => {
                marker.setRadius(radius);
            });
        }
    });

    updateViewportBounds();

    // updateViewportBounds after 15s of inactivity
    map.on("move", resetInactivityTimeout);
    map.on("zoom", resetInactivityTimeout);

    // Initial call to set the inactivity timeout
    resetInactivityTimeout();
    
    easterEgg()

});



