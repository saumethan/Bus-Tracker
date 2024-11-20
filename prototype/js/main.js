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
                $("#refreshTime").text("Last updated: " + formattedTime);

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

            showUserLocation();

            // Refresh viewport to load all buses
            updateViewportBounds();

            
            
            // append html to DOM
            $("#busData").html("");

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
    locationButton.addTo(mapInstance);
}

// Layer to style the map
function addTileLayer(mapInstance) {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(mapInstance);
}

function drawRoute(serviceId, tripId) {
    // Initialize the busData object if it doesn't exist
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
                console.log("tripId = " + fetchedData[0].tripId);
                busData.tripId = fetchedData[0].tripId; // Set the tripId for future use
            }
        });
    } else {
        console.log("tripId is already defined: " + busData.tripId);
    }

    // Ensure tripId is provided before making the second API call
    if (tripId) {
        const url = `https://bustimes.org/api/trips/${tripId}/?format=json`;

        $.getJSON(url, data => {
            // Array for route coordinates
            const routeCoords = [];

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
        console.log("Invalid tripId provided.");
    }
}

// Helper function to adjust the map view to the newly drawn route
function adjustMapViewToRoute(route) {
    if (route) {
        map.fitBounds(route.getBounds());
    }
}

// Fit the map to the route
function adjustMapViewToRoute(routeLayer) {
    map.fitBounds(routeLayer.getBounds());
}

// Get the bus data for a specific bus route
function getSpecificBusGPS(nocCode, route) {
    console.log(nocCode);
    const url = `https://bustimes.org/vehicles.json?operator=${nocCode}`;

    $.getJSON(url, data => {
        // Filter data for the bus route
        console.log(route);
        console.log("Data received:", data); 
        const filteredBuses = data.filter(bus => bus.service && bus.service.line_name && bus.service.line_name === route);

        // get the longitude and latitude
        const busData = filteredBuses.map(bus => ({
            longitude: bus.coordinates[0],
            latitude: bus.coordinates[1],
            route: bus.service.line_name,
            destination: bus.destination
        }));
        console.log(busData);
        drawBus(busData, map);
    });
}

// Get the bus data for all bus routes in viewport 
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
        // Gets the longitude and latitude
        const busData = data.map(bus => ({
            longitude: bus.coordinates[0],
            latitude: bus.coordinates[1],
            route: bus.service ? bus.service.line_name : 'Unknown',
            destination: bus.destination,
            tripId: bus.trip_id,
            serviceId: bus.service_id,
            noc: bus.vehicle.url.split('/')[2].split('-')[0].toUpperCase()
        }));
        drawBus(busData, map);
    }).fail(function() {
        console.error("Error fetching bus data.");
    });
}

function drawBus(busData, map) {
    let htmlContent = "";
    // Remove existing bus markers
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }

    map.busMarkers = [];

    // Draw each bus marker
    busData.forEach(coord => { 

        const circle = L.circle([coord.latitude, coord.longitude], {
            color: 'red', 
            fillColor: '#f03', 
            fillOpacity: 0.5,
            radius: radius
        }).addTo(map);

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

            htmlContent += `
                <div class="busTimeRecord">
                    <h2 id="busRoute">${coord.route} </h2>
                    <h4 id="busDestination">${coord.destination}</h4>
                    <p id="refreshTime">${formattedTime}</p>
                </div>
            `;
            
            // append html to DOM
            $("#busData").html(htmlContent);
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

// Get the stops in the viewport
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

    // get nearby stops
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

// Fetch stop ID from API or cached data
async function fetchStopId(stop) {
    if (!transitStopIds[stop.bustimes_id]) {
        const response = await $.ajax({
            type: "GET",
            url: BUS_PROXY + `https://external.transitapp.com/v3/public/nearby_stops?lat=${stop.latitude}&lon=${stop.longitude}&max_distance=500`,
            dataType: "json",
            headers: { "apiKey": TRANSIT_API_KEY },
        });

        // find the stop id that is used in transit app
        if (response && response.stops) {
            response.stops.forEach(thisStop => {
                console.log(thisStop)
                if (thisStop.rt_stop_id === stop.bustimes_id) {
                    transitStopIds[stop.bustimes_id] = thisStop.global_stop_id;
                }
            });
        }
    }

    // return the fetched stop id
    return transitStopIds[stop.bustimes_id];
}

// Load the bus times for a specific stop
async function loadStopTimes(stopId) {
    // clear old bus times html
    $("#busData").html("<h3>Loading bus stop times...</h3>");

    // make request to transit api
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

    // load times
    if (response && response.status && response.status.success) {
        const departures = response.stopDepartures;

        // sort departures by scheduledDeparture
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        departures.sort((a, b) => 
            new Date(a.scheduledDeparture) - new Date(b.scheduledDeparture)
        );

        // format the bus times into HTML
        let htmlContent = "";
        for (let i = 0; i < 20; i++) {
            // get bus at index
            const bus = departures[i];
            if (!bus) break;

            // get departure times
            let scheduledDeparture = new Date(bus.scheduledDeparture).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            let realTimeDeparture = new Date(bus.realTimeDeparture || bus.scheduledDeparture).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            
            // fixes glitch with the API output where some buses appear twice
            let scheduledDepartureLong = new Date(bus.scheduledDeparture).toLocaleTimeString()
            if (!scheduledDepartureLong.endsWith("00")) continue;

            // get bus status
            let busStatus = "";
            let statusColor = "black";
            if (bus.cancelled) {
                busStatus = "CANCELLED";
                statusColor = "red";
            } else if (scheduledDeparture === realTimeDeparture) {
                busStatus = "ON TIME";
                statusColor = "green";
            } else {
                busStatus = "DELAYED";
                statusColor = "orange";
            }

            // get destination and shorten where too long
            let destination = bus.destination;
            if (bus.destination.length > 12) {
                destination = bus.destination.substring(0, 12) + "...";
            }

            // format time string for expected times
            let timeString = `${scheduledDeparture}`
            if (scheduledDeparture !== realTimeDeparture) {
                timeString += ` (Exp: ${realTimeDeparture})`
            }

            // add to html
            htmlContent += `
                <div class="busTimeRecord">
                    <h2>${bus.serviceNumber} <span id="destination">to ${destination}</span></h2>
                    <p id="times">${timeString}<br><span style="color:${statusColor};">${busStatus}</span></p>
                </div>
            `;
        }

        // append html to DOM
        $("#busData").html(htmlContent);
    }
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
            color: "blue", 
            fillColor: "#0362fc", 
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
        circle.bindTooltip(toolTipContent, { permanent: false, direction: "top" });

        // makes the tooltip permanent when clicked on
        circle.on("click", (event) => {
            // stop stop tooltip
            map.stopMarkers.forEach(marker => {
                marker.closeTooltip();
            });
            circle.openTooltip();

            // load scheduled buses for this stop
            // find this stop id from cached data or request api
            // fetchStopId(stop).then((id) => {
            //     console.log(id);
            //     if (id) {
            //         loadStopTimes(id);
            //     } else {
            //         console.log("Could not find any information about this stop.")
            //     }
            // });

            loadStopTimes(stop.bustimes_id);
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
    drawStopsInViewport(maxY, maxX, minY, minX);
}

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
            alert("Unable to retrieve your location. (error 1)"); // error 1
            map.setView([userLat, userLng]);
        });
    } else {
        alert("Unable to retrieve your location. (error 2)"); // error 2
    }
}

function resetInactivityTimeout() {
    // Clear the existing timeout
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    
    // Set a new timeout 
    inactivityTimeout = setTimeout(updateViewportBounds, 15000);
}

function easterEgg() {
    $("#easterEggButton").click(function () {
        const container = $("#easterEggContainer");
        // remove existing images
        container.innerHTML = ""; 
    
        // Number of images
        const imageCount = 110;
    
        for (let i = 0; i < imageCount; i++) {
            setTimeout(() => {
                const img = document.createElement("img");
                img.src = "images/BusTracker.png"; 
        
                // random size, position, and rotation
                const randomSize = Math.random() * 80 + 100; 
                const randomX = Math.random() * 100; 
                const randomY = Math.random() * 100; 
                const randomRotation = Math.random() * 360; 
        
                // styles
                img.style.width = `${randomSize}px`;
                img.style.height = `${randomSize}px`;
                img.style.position = "absolute";
                img.style.left = `${randomX}vw`;
                img.style.top = `${randomY}vh`;
                img.style.transform = `rotate(${randomRotation}deg)`;
        
                // Add to container
                container.appendChild(img);
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