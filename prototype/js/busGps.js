/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality relating to the bus map, including plotting of stops + GPS tracking of buses.
 */

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
        return busData;
    });
}

// ------------------ Function to get the bus data for all bus routes in viewport ------------------
function getAllBusGPS(yMax, xMax, yMin, xMin) {
    // Don't show buses when zoomed far out
    // if (currentZoom < 12) {
    //     if (map.busMarkers) {
    //         map.busMarkers.forEach(marker => {
    //             map.removeLayer(marker);
    //         });
    //     }
    //     return;
    // }

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
        return busData;
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

            drawBus(coord.serviceId, coord.tripId); 

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

// Export functions
export { fetchStopsInViewport, fetchStopId, loadStopTimes, drawStops };