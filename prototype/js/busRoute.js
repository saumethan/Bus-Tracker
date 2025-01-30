/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

// ------------------ Function to draw the bus route ------------------
function drawRoute(serviceId, tripId) {
    
    if (map.busMarkers) {
        map.busMarkers.forEach(marker => map.removeLayer(marker));
    }
    if (route) {
        map.removeLayer(route);
    }

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

