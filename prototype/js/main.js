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

// Initialize the map and set its location
function createMap() {
    const mapInstance = L.map('map').setView([57.1497, -2.0943], 13); // Aberdeen
    addTileLayer(mapInstance); 
    return mapInstance;
}

// Layer to style the map
function addTileLayer(mapInstance) {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(mapInstance);
}

function addRoute(clickedLatitude, clickedLongitude) {
    // request to get near routes
    let busRoute = {
        "url": `https://cors-anywhere.herokuapp.com/https://external.transitapp.com/v3/public/nearby_routes?lat=${clickedLatitude}&lon=${clickedLongitude}&max_distance=20`,
        "method": "GET",
        "timeout": 0,
        "headers": {
            "apiKey": "5b47ee0c0046d256e34d4448e229970472dc74e24ab240188c51e12192e2cd74"
        },
    };

    $.ajax(busRoute)
        .done(function (response) {
            let targetRouteId = null;

            // Log the response
            console.log(response);

            for (const route of response.routes) {
                const shortNameElements = route.compact_display_short_name.elements;

                if (shortNameElements && shortNameElements.includes(gpsRoute)) {
                    targetRouteId = route.global_route_id;
                    break; // Exit the loop once route is found
                }
            }

            // Proceed if route is found
            if (targetRouteId) {
                console.log("Found Route ID:", targetRouteId);
                
                let PolylineRoute = {
                    "url": `https://cors-anywhere.herokuapp.com/https://external.transitapp.com/v3/public/route_details?global_route_id=` + targetRouteId,
                    "method": "GET",
                    "timeout": 0,
                    "headers": {
                        "apiKey": "5b47ee0c0046d256e34d4448e229970472dc74e24ab240188c51e12192e2cd74"
                    },
                };

                $.ajax(PolylineRoute)
                    .done(function (response) {
                        // Log response
                        console.log(response);

                        if (response.itineraries && response.itineraries.length > 0) {
                            let shape = response.itineraries[0].shape; 
                            
                            const latlngs = polyline.decode(shape).map(coords => [coords[0], coords[1]]);

                            // Remove the existing route
                            if (typeof route !== 'undefined' && route) {
                                map.removeLayer(route); 
                            }

                            // Add the new polyline to the map
                            route = L.polyline(latlngs, {
                                color: '#3498db', 
                                weight: 4,
                                opacity: 0.8,
                            }).addTo(map);

                            // Adjust the map to fit the route
                            adjustMapViewToRoute(route);
                        } else {
                            console.log("No shape data found.");
                        }
                    })
                    .fail(function (error) {
                        console.error("Error fetching route details:", error);
                    });
            } else {
                console.log("No route found.");
            }
        })
        .fail(function (error) {
            console.error("Error fetching or processing data:", error);
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
            destination: bus.destination
        }));

        drawBus(busData, map);
    });
}

function drawBus(busData, map) {
    // Removes existing bus markers
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }

    // Array of bus markers
    map.busMarkers = [];

    // Makes a circle for each bus
    busData.forEach(coord => {
        const { longitude, latitude, route, destination } = coord;

        // Bus marker
        const circle = L.circle([latitude, longitude], {
            color: 'red', 
            fillColor: '#f03', 
            fillOpacity: 0.5,
            radius: radius
        }).addTo(map);

        // Tooltip content
        const toolTipContent = ` 
            <div>
                <strong>Route: ${route}</strong><br>
                Destination: ${destination}<br>
            </div>
        `;

        circle.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });

        // Makes the tooltip permanent when clicked on
        circle.on('click', (event) => {
            // lat and lng of clicked bus
            let clickedLatitude = event.latlng.lat;
            let clickedLongitude = event.latlng.lng;

            gpsRoute = route;
            viewAllBuses = false;

            // Refresh the view with specific bus 
            refreshSpecificBusRoute(clickedLatitude, clickedLongitude);

            // Update markers and tooltips 
            map.busMarkers.forEach(marker => {
                marker.closeTooltip(); // Closes open tooltips
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
            });

            // Makes the clicked bus's tooltip permanent
            circle.bindTooltip(toolTipContent, { permanent: true, direction: 'top' }).openTooltip();

            // Update HTML content for bus route and destination
            document.getElementById("busRoute").textContent = "Route: " + route;
            document.getElementById("busDestination").textContent = "Destination: " + destination;

            // Update the time the data was last refreshed
            const now = new Date();
            const formattedTime = now.toLocaleTimeString(); // Format the time 
            document.getElementById("refreshTime").textContent = "Last updated: " + formattedTime;
        });

        map.busMarkers.push(circle);
    });

    // Hide tooltip if clicking outside any marker
    map.on('click', () => {
        map.busMarkers.forEach(marker => {
            marker.closeTooltip();
            marker.unbindTooltip();
        });
    });
}

// Function to update map with specific bus route
function refreshSpecificBusRoute(clickedLatitude, clickedLongitude) {
    // Clear existing markers and route
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => map.removeLayer(marker));
    }
    if (route) {
        map.removeLayer(route);
    }

    // Fetch and draw the selected route and bus data
    addRoute(clickedLatitude, clickedLongitude); 
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
    }
    getStopsInViewport(maxY, maxX, minY, minX);
}

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", function() {
    map = createMap();
    updateViewportBounds();

    if (viewAllBuses === true) {
        map.on('moveend', updateViewportBounds); 
        map.on('zoomend', updateViewportBounds);
    } 

    // resize the buses as the user zooms in
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
    })
}); 