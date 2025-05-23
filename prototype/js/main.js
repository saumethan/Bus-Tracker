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
let currentZoom = 13;
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

// ------------------ Function to draw the bus route ------------------
function drawRoute(serviceId, tripId) {
    // Initialise the busData object if it doesn't exist
    if (typeof busData === 'undefined') {
        busData = {};
    }

    if (busData.tripId === undefined) {
        const url = `https://bustimes.org/vehicles.json?service=${serviceId}`;
        $.getJSON(url, function(data) {
            const fetchedData = data.map(bus => ({
                tripId: bus.trip_id,
                noc: bus.vehicle.url.split('/')[2].split('-')[0].toUpperCase()
            }));

            // Ensure we log the first tripId correctly
            if (fetchedData.length > 0) {
                busData.tripId = fetchedData[0].tripId; 
            }
        });
    }

    // Ensure tripId is provided before making the second API call
    if (tripId) {
        const url = `https://bustimes.org/api/trips/${tripId}/?format=json`;

        $.getJSON(url, data => {
            // Array for route coordinates
            const routeCoords = [];
            busRouteNotFound = false;

            // Extract coordinates from data
            data.times.forEach(stop => {
                if (stop.track) {
                    stop.track.forEach(coord => {
                        routeCoords.push([coord[1], coord[0]]);
                    });
                } else if (stop.stop && stop.stop.location) {
                    routeCoords.push([stop.stop.location[1], stop.stop.location[0]]);
                }
            });

            // Remove the existing route if it exists
            if (typeof route !== 'undefined' && route) {
                map.removeLayer(route);
            }

            // Add the new route to the map
            route = L.polyline(routeCoords, {
                color: '#3498db',
                weight: 4,
                opacity: 0.8,
            }).addTo(map);

            // Adjust the map view to fit the route
            adjustMapViewToRoute(route);
            
        });
    } else {
        busRouteNotFound = true;
    }
}

// ------------------ Helper function to adjust the map view to the newly drawn route ------------------
function adjustMapViewToRoute(route) {
    if (route) {
        map.fitBounds(route.getBounds());
    }
}

// ------------------ Function to fit the map to the route ------------------
function adjustMapViewToRoute(routeLayer) {
    map.fitBounds(routeLayer.getBounds());
}

// ------------------ Function to get the bus data for a specific bus route ------------------ 
function getSpecificBusGPS(nocCode, route) {
    const url = `https://bustimes.org/vehicles.json?operator=${nocCode}`;

    $.getJSON(url, data => {
        // Filter data for the bus route
        const filteredBuses = data.filter(bus => bus.service && bus.service.line_name && bus.service.line_name === route);

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

// ------------------ Function to get the bus data for all bus routes in viewport ------------------
function getAllBusGPS(yMax, xMax, yMin, xMin) {
    // Don't show buses when zoomed far out
    if (currentZoom < 12) {
        if (map.busMarkers) {
            map.busMarkers.forEach(marker => {
                map.removeLayer(marker);
            });
        }
        return;
    }

    // Get the bus GPS locations
    const url = `https://bustimes.org/vehicles.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;

    $.getJSON(url, function(data) {
        const busData = [];
        data.forEach(bus => {
            if (!bus.service || !bus.service.line_name) return;
            busData.push({
                longitude: bus.coordinates[0],
                latitude: bus.coordinates[1],
                route: bus.service.line_name,
                destination: bus.destination,
                tripId: bus.trip_id,
                serviceId: bus.service_id,
                noc: bus.vehicle.url.split("/")[2].split("-")[0].toUpperCase()
            });
        })
        // Calls draw bus function
        drawBus(busData, map);
    }).fail(function() {
        console.error("Error fetching bus data.");
    });
}

// ------------------ Function to draw the buses ------------------
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
        const icon = L.icon({
            iconUrl: "./images/BusTracker.png", 
            iconSize: [44.5, 25],  
        });
    
        const circle = L.marker([coord.latitude, coord.longitude], {icon: icon}).addTo(map);

        const toolTipContent = ` 
            <div>
                <strong>Route: ${coord.route}</strong><br>
                Destination: ${coord.destination}<br>
            </div>
        `;

        circle.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });

        // Add click event listener to the bus marker
        circle.on('click', (event) => {
            nocCode = coord.noc;
            gpsRoute = coord.route;
            viewAllBuses = false;

            refreshSpecificBusRoute(coord.serviceId, coord.tripId); 

            // Reset tooltips on all markers
            map.busMarkers.forEach(marker => {
                marker.closeTooltip(); 
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
            });

            // Make clicked bus's tooltip permanent
            circle.bindTooltip(toolTipContent, { permanent: true, direction: 'top' }).openTooltip();

            // Update the refresh time
            const now = new Date();
            const formattedTime = now.toLocaleTimeString(); 

            htmlContent="";
            htmlContent += `
                <div class="bus-time-record">
                    <h2>${coord.route} <span id="destination">to ${coord.destination}</span></h2>
                </div
            `;
            if (busRouteNotFound === true) {
                htmlContent += `<h2>Bus route not found</h2>`
            }
            
            // append html to DOM
            $("#bus-data").html(htmlContent);
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

// ------------------ Function to update map with specific bus route ------------------
function refreshSpecificBusRoute(serviceId, busId) { 
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => map.removeLayer(marker));
    }
    if (route) {
        map.removeLayer(route);
    }

    // Fetch and draw the selected route and bus data
    drawRoute(serviceId, busId); 
    getSpecificBusGPS(nocCode, gpsRoute);
}

// ------------------ Function to draw the stops in the viewport ------------------
function drawStopsInViewport(yMax, xMax, yMin, xMin) {
    // don't show stops when zoomed far out
    if (currentZoom < 15) {
        if (map.stopMarkers) {
            map.stopMarkers.forEach(marker => {
                map.removeLayer(marker);
            });
        }
        return;
    }

    // Get nearby stops
    const url = `https://bustimes.org/stops.json?ymax=${yMax}&xmax=${xMax}&ymin=${yMin}&xmin=${xMin}`;
    $.getJSON(url, function(data) {
        // parse the stop data into a better format
        const stopsData = data.features.map(stop => ({
            longitude: stop.geometry.coordinates[0],
            latitude: stop.geometry.coordinates[1],
            services: stop.properties.services,
            bustimes_id: stop.properties.url.split("/")[2],
            name: stop.properties.name
        }));

        // plot all bus stops in the viewport
        drawStops(stopsData, map);
    });
}

// ------------------ Function to fetch stop ID from API or cached data ------------------
async function fetchStopId(stop) {
    if (!transitStopIds[stop.bustimes_id]) {
        const response = await $.ajax({
            type: "GET",
            url: BUS_PROXY + `https://external.transitapp.com/v3/public/nearby_stops?lat=${stop.latitude}&lon=${stop.longitude}&max_distance=500`,
            dataType: "json",
            headers: { "apiKey": TRANSIT_API_KEY },
        });

        // Find the stop id that is used in transit app
        if (response && response.stops) {
            response.stops.forEach(thisStop => {
                if (thisStop.rt_stop_id === stop.bustimes_id) {
                    transitStopIds[stop.bustimes_id] = thisStop.global_stop_id;
                }
            });
        }
    }

    // Return the fetched stop id
    return transitStopIds[stop.bustimes_id];
}

// ------------------ Function to load the bus times for a specific stop ------------------ 
async function loadStopTimes(stopId) {
    // clear old bus times html
    $("#bus-data").html("<h3>Loading bus stop times...</h3>");

    // Make request to api
    try {
        const response = await $.ajax({
            type: "POST",
            url: LIVE_TIMES_URL,
            contentType: "application/json",
            data: JSON.stringify({
                clientTimeZoneOffsetInMS: 0,
                departureDate: new Date().toISOString(),
                departureTime: new Date().toISOString(),
                stopIds: [ stopId ],
                stopType: "BUS_STOP",
                requestTime: new Date().toISOString(),
                departureOrArrival: "DEPARTURE",
                refresh: false,
                source: "WEB"
            }),
            headers: { "ocp-apim-subscription-key": LIVE_TIMES_KEY }
        });

        // Load times
        if (response && response.status && response.status.success) {
            const departures = response.stopDepartures;

            // Sort departures by scheduled departure
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
            departures.sort((a, b) => 
                new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture)
            );

            // Format the bus times into HTML
            htmlContent="";
            for (let i = 0; i < 20; i++) {
                // get bus at index
                const bus = departures[i];
                if (!bus) break;

                // Get departure times
                let scheduledDeparture = new Date(bus.scheduledDeparture).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                let realTimeDeparture = new Date(bus.realTimeDeparture || bus.scheduledDeparture).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                
                // fixes glitch with the API output where some buses appear twice
                if (!bus.operator || !bus.operator.operatorName) continue;
                if (bus.operator.operatorName.includes("Stagecoach")) {
                    let scheduledDepartureLong = new Date(bus.scheduledDeparture).toLocaleTimeString()
                    if (!scheduledDepartureLong.endsWith("00")) continue;
                }
                
                // Get bus status
                let busStatus = "ON TIME";
                let statusColor = "green";
                if (bus.cancelled) {
                    // Bus is cancelled
                    busStatus = "CANCELLED";
                    statusColor = "red";
                } else if (scheduledDeparture < realTimeDeparture) {
                    // Real time is after scheduled time so bus is delayed
                    busStatus = "DELAYED";
                    statusColor = "orange";
                } else if (!bus.realTimeDeparture) {
                    // Bus does not have a real time departure, so we cannot reliably predict that it is on time
                    busStatus = "SCHEDULED";
                    statusColor = "black";
                }

                // Get destination and shorten where too long
                let destination = bus.destination;
                if (bus.destination.length > 18) {
                    destination = bus.destination.substring(0, 18) + "...";
                }

                // Format time string for expected times
                let timeString = `${scheduledDeparture}`
                if (scheduledDeparture !== realTimeDeparture) {
                    timeString += ` (Exp: ${realTimeDeparture})`
                }

                // Add to html
                htmlContent += `
                    <div class="bus-time-record">
                        <h2>${bus.serviceNumber} <span class="destination">to ${destination}</span></h2>
                        <p class="times">${timeString}<br><span style="color:${statusColor};">${busStatus}</span></p>
                    </div>
                `;
            }

            // Append html to DOM
            $("#bus-data").html(htmlContent);
        } else {
            // Handle error with API response
            $("#bus-data").html("<h4>Could not fetch departures data for this stop. This may be because no buses currently serve the stop.</h4>");
        }
    } catch (err) {
        // handle error
        $("#bus-data").html("<h4>Could not fetch departures data for this stop. This may be because no buses currently serve the stop.</h4>");
    }
}

// ------------------ Function to draw stops on the map ------------------
function drawStops(stopsData, map) {
    // remove existing stop markers
    if (map.stopMarkers) {
        map.stopMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }

    // Plot a circle for each bus stop
    map.stopMarkers = [];
    stopsData.forEach(stop => {
        // create marker
        const circle = L.circle([stop.latitude, stop.longitude], {
            color: "red", 
            fillColor: "red", 
            fillOpacity: 0.5,
            radius: radius
        }).addTo(map);

        // Get services for this stop as a string
        let stopServicesString = "";
        stop.services.forEach(serviceName => {
            stopServicesString += serviceName + ", ";
        });

        if (stopServicesString.length === 0) {
            stopServicesString = "This stop is currently serving no buses";
        } else {
            stopServicesString = stopServicesString.substring(0, stopServicesString.length-2);
        }

        // Bind tooltip
        const toolTipContent = `
            <div>
                <strong>Stop: ${stop.name}</strong><br>
                Services: ${stopServicesString}<br>
            </div>
        `;
        circle.bindTooltip(toolTipContent, { permanent: false, direction: "top" });

        // Makes the tooltip permanent when clicked on
        circle.on("click", (event) => {
            // Stop stop tooltip
            map.stopMarkers.forEach(marker => {
                marker.closeTooltip();
                marker.setStyle({ fillColor: "red", color: "red" });
            });
            circle.setStyle({ fillColor: "#ff9100", color: "#ff9100" });
            circle.openTooltip();
            loadStopTimes(stop.bustimes_id);
        });

        map.stopMarkers.push(circle);
    });
}

// ------------------ Function to update the map viewport ------------------
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
    drawStopsInViewport(maxY, maxX, minY, minX);
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
    map = createMap();
    addRefreshButtonToMap(map);
    addHomeButtonToMap(map);
    addLocationButtonToMap(map);

    // Call the function to show user's current location
    showUserLocation();

    if (viewAllBuses === true) {
        map.on("moveend", updateViewportBounds); 
        map.on("zoomend", updateViewportBounds);
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

        // if (map.busMarkers) {
        //     map.busMarkers.forEach(marker => {
        //         marker.setRadius(radius);
        //     });
        // }
    });

    updateViewportBounds();

    // UpdateViewportBounds after 15s of inactivity
    map.on("move", resetInactivityTimeout);
    map.on("zoom", resetInactivityTimeout);

    // Initial call to set the inactivity timeout
    resetInactivityTimeout();
    
    easterEgg()
});