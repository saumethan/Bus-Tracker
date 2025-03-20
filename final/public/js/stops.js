/**
 * @author Owen Meade @owenrgu
 * @author Ethan Saum @saumethan272
 * @description A module handling stop information, including fetching from relevant APIs and drawing stops on a map
 */

import { findBus } from "./busGps.js";
import { setViewAllBuses, updateBusesAndStops } from "./map.js";
import { removeRoute } from "./busRoute.js";
import { getSpecificBusGPS, drawBus } from "./busGps.js";

// Constants
const TRANSIT_API_KEY = "5b47ee0c0046d256e34d4448e229970472dc74e24ab240188c51e12192e2cd74";
const BUS_PROXY = `https://europe-west2-legendoj1-portfolio.cloudfunctions.net/busproxy/?apiKey=${TRANSIT_API_KEY}&url=`;

// Variables
let transitStopIds = {};

// Functions
/**
 * Finds a list of stops in the given viewport bounds.
 */
async function fetchStopsInViewport(yMax, xMax, yMin, xMin) {
    // get nearby stops
    const response = await $.ajax({
        type: "GET",
        url: `/api/stops?yMax=${yMax}&xMax=${xMax}&yMin=${yMin}&xMin=${xMin}`,
        dataType: "json",
    });

    if (response) {
        return response;
    } else {
        return []; // return an empty array if there was no respones
    }
}

/**
 * Fetches a given stop ID from the Transit App API.
 * This API can be slow and has limited uses so a cache is implemented too.
 *
 * The stop will have a bustimes ID (from bustimes.org API) which can be used
 * to fetch the Transit App stop ID. Of course Transit App had to be difficult
 * and have a different ID to every other bus API provider 🤦
 */
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

/**
 * Outputs the live times for a given stop in the bus-data window on the
 * left of the sceen.
 * 
 * Note that this is using a key from Traveline map which we should probably
 * change to a different API in future.
 */
async function loadStopTimes(stopId, latitude, longitude, map) {
    // clear old bus times html
    $("#bus-data").html("<h3>Loading bus stop times...</h3>");

    // make request to api
    try {
        const response = await $.ajax({
            type: "GET",
            url: `/api/stops/times?stopId=${stopId}`,
            dataType: "json",
        });

        // load times
        if (response && response.status && response.status.success) {
            const departures = response.stopDepartures;

            // sort departures by scheduled departure
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
                if (!bus.operator || !bus.operator.operatorName) continue;
                if (bus.operator.operatorName.includes("Stagecoach")) {
                    let scheduledDepartureLong = new Date(bus.scheduledDeparture).toLocaleTimeString()
                    if (!scheduledDepartureLong.endsWith("00")) continue;
                }
                
                // get bus status
                let busStatus = "ON TIME";
                let statusColor = "green";
                if (bus.cancelled) {
                    // bus is cancelled
                    busStatus = "CANCELLED";
                    statusColor = "red";
                } else if (scheduledDeparture < realTimeDeparture) {
                    // real time is after scheduled time so bus is delayed
                    busStatus = "DELAYED";
                    statusColor = "orange";
                } else if (!bus.realTimeDeparture) {
                    // bus does not have a real time departure, so we cannot reliably predict that it is on time
                    busStatus = "SCHEDULED";
                    statusColor = "black";
                }

                // get destination and shorten where too long
                let destination = bus.destination;
                if (bus.destination.length > 18) {
                    destination = bus.destination.substring(0, 18) + "...";
                }

                // format time string for expected times
                let timeString = `${scheduledDeparture}`
                if (scheduledDeparture !== realTimeDeparture) {
                    timeString += ` (Exp: ${realTimeDeparture})`
                }

                console.log(bus)
                console.log(bus.operator.operatorCode)
                // TODO: pass this to the bus data div
                console.log(bus.destination)
                console.log(bus.serviceNumber)

                // add to html
                htmlContent += `
                    <div class="bus-time-record" data-service-number="${bus.serviceNumber}" data-operator-code="${bus.operator.operatorCode}">
                        <h2>
                            <button type="button" class="btn-link number">${bus.serviceNumber}</button>
                            <span class="destination">to ${bus.destination}</span>
                        </h2>
                        <p class="times">${timeString}<br><span style="color:${statusColor};">${busStatus}</span></p>
                    </div>
                `;
        }

        // Append the generated HTML to the DOM
        $("#bus-data").html(htmlContent);

        document.querySelectorAll(".bus-time-record").forEach((element) => {
            element.addEventListener("click", async () => {
                const serviceNumber = element.dataset.serviceNumber;
                const noc = element.dataset.operatorCode;
                console.log(latitude, longitude);
                const busData = await getSpecificBusGPS(serviceNumber, latitude, longitude);
                drawBus(busData, map);
            });
        });
    } else {
            // handle error with API response
            $("#bus-data").html("<h4>Could not fetch departures data for this stop. This may be because no buses currently serve the stop.</h4>");
        }
    } catch (err) {
        console.log(err);
        // handle error
        $("#bus-data").html("<h4>Could not fetch departures data for this stop. This may be because no buses currently serve the stop.</h4>");
    }
}

function updateURLWithStop(stopId) {
    // Update URL without refreshing page
    const newUrl = window.location.origin + window.location.pathname + `?stop=${stopId}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
}

/**
 * Draws the stops on the map.
 * Expects stopsData from `fetchStopsInViewport()` to be passed, as well as the map object,
 * so should be called from within the `map.js` file.
 */
async function drawStops(stopsData, map) {
    // remove existing stop markers
    if (map.stopMarkers) {
        map.stopMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
    }
    if (map.currentZoom < 15) return; // don't show stops when zoomed too far out

    // plot a circle for each bus stop
    map.stopMarkers = [];
    stopsData.forEach(stop => {
        // create marker
        const icon = L.icon({
            iconUrl: `https://i.ibb.co/WNWc6gGK/busStop.png`, 
            iconSize: [50, 50], 
        });
        const circle = L.marker([stop.latitude, stop.longitude], {icon: icon}).addTo(map);

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
        circle.bindTooltip(toolTipContent, { permanent: false, direction: "top", offset: [0, -20] });

        // makes the tooltip permanent when clicked on
        circle.on("click", (event) => {
            // stop tooltip
            map.stopMarkers.forEach(marker => {
                marker.closeTooltip();
                marker.setIcon(L.icon({ iconUrl: "https://i.ibb.co/WNWc6gGK/busStop.png", iconSize: [50, 50] }));
            });
            circle.setIcon(L.icon({ iconUrl: "https://i.ibb.co/5XCC3MPt/clicked-Bus-Stop.png", iconSize: [50, 50] }));
            circle.openTooltip();

            updateURLWithStop(stop.bustimes_id)

            map.setView([stop.latitude, stop.longitude], 15);
            
            setViewAllBuses(true);
            
            removeRoute(map);
            updateBusesAndStops();

            loadStopTimes(stop.bustimes_id, stop.latitude, stop.longitude, map);
        });

        map.stopMarkers.push(circle);
    });
}


// Export functions
export { fetchStopsInViewport, fetchStopId, loadStopTimes, drawStops };