/**
 * @author Ethan Saum @saumethan272
 * @version 1.0
 * @description Bus Tracker
 */

// Variables
let map;  
let route; 
let gpsRoute = "X8";
let nocCode = "SBLB";
//let encodedPolyline = "wotzIrpsLJ^jB~EPRBBVBdByAtBaC^w@Po@Lu@FkACcA_AqLKwB?iFAm@]oDu@_HIcAGaBB_ABkAHcAaDgBQCIFaC~CoEeQKq@I_AIqHDk@Jk@b@qAPgADkBJqJkKYYMHm@jAeEtH{GHMBUQy]}AB[BoNRKIEg@oA`AW@]AWUwBkCkC_D{@{@eAy@_@U[?Qn@QjCg@xD[rAYl@c@j@URc@T_@JsOfAgHU{ADqFBqAIk@YUFMHELU\\_@?YMQc@Gk@?g@Fi@PYXULWL}BPoAX_AjBkCPo@PyA@cAEcAeC{PaEgRyDsNK_@kXkr@sAqCqBmDoAgBcBuBaBeBgEaDmCqAcCy@ai@_JkD}@wCcAuB_AmGwDaGaFc[q[}AqAk@a@_CcAwB_@kCMuBHaBXoGbBaBPkA?qAUm@So@a@gA_Ai@q@k@}@g@cAu@yBoCoK{@cC]y@m@cAg@o@g@e@m@a@q@_@o@Qm@IaBGsGXgB?}BMg[qDgASgKaCyAc@_DoAaCyAoAcA}B_Cy@gA{AaCyAkCy@gAUQWCk@^MTk@b@c@Dm@E]Y_AcBYUI?}@l@e@|@Qb@Q~@Gf@E`BRzF?fAEbAk@hGCh@BjBf@nIHjFN`KOfDEt@g@~DQx@g@hBf@iBPy@f@_EDu@NgDYmRg@oICkBBi@j@iGDcA?gAS{FDaBFg@P_APc@d@}@J[HgA?g@Jc@PSLCf@cAd@sAvAyCZy@Lu@Fu@?cAG}@Mu@_@w@c@o@g@[m@YeAnDAt@^rAtL`X|BxDbAvA`AfAtBxBjAz@fBbA~@\\~P`ECx@gKaCyAc@_DoAaCyAoAcA}B_Cy@gA{AaC_EqHuTcg@kB}Cg@o@eAkAs@i@qAy@yAm@}AYyBEuBHqGt@sCTuBDsBImBU}A[eDkA_[sO}BaAmB_@_DQqBLuZtEQDq@sVE{@QcAy@sCgHmSaGqY}C|CaErD}At@|Au@VUhD}C|C}CsNat@K[Wo@_@c@wAq@Sb@YP{@PmFLUFUPkB|CWZk@`@_AZeBf@NvNlCtNFnAPHFX?ZHNPb@nBzIoB{IQc@IOOTQBIUC[BQFQHCGoAmCuNOwNQ?m@ToEtCs@^kC|@[Py@lAiFdLkAbBmArA}AbAgBt@}AToBDcBU_Bc@oBmAgAkA}BeDaAmBu@}Bi@wBaD_K}CyHsBgEyBsDqAsBcH{Im@kAc@cA]y@Mu@MgAMk@_@WO_@?k@Pm@TGPHFNVPPH^GXSXa@R_ABm@CaASw@]y@g@u@[Q_@Q{Eo@qBi@cG}@cHyAaFyAyLwEsKsFw@UsEyB]ImGoDkCeAcBWiCYcAC_@Fg@C}KyDmB_@aBKgACkDTgGx@mCt@wD~AsC`BcHlEuDtBiBp@kEpAgBb@gBTeE\\kB@yT[oA?gC^kBf@cBx@eExBeAb@_B^}AFcBKgASsAk@{@k@gA_AiFiFuAu@}A[u@Gc@?UPQXIb@MPM?o@}@Q_BIOUSaBeC_LuS{EwM[gAKw@CGgMcIIBKFE?QUQQqE}AWCaALe@Tg@^aAhB_AlAYPcAXmAT}HhAEB}@jAoM`X_A`DCLGTIHI?GA[@OA{QiEcBg@kIqGc@WoOaz@`EuEL]Bg@qAsHU][c@GM?c@FYPe@V]XSPc@Bc@c@kB";
let viewAllBuses = true;

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

// Adds a route to the map
function addRoute() {

    const url =  './local_api_files/X8.json'

    $.getJSON(url, data => {
        
        // get the encoded polyline
        const busData = data.map(bus => ({
            
            destination: bus.destination
        }));

        drawBus(busData, map);
    });
    const latlngs = polyline.decode(encodedPolyline).map(coords => [coords[0], coords[1]]);
    
    // Remove existing route if any
    if (route) {
        map.removeLayer(route);
    }
    
    // Adds the polyline to a layer on the map
    route = L.polyline(latlngs, {
        color: '#3498db', // Route color
        weight: 4,
        opacity: 0.8,
    }).addTo(map);

    // Fit the map to the route
    adjustMapViewToRoute(route);
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

// Draws circles for each bus on the map
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
            radius: 50 
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
            map.busMarkers.forEach(marker => {
                marker.closeTooltip(); // Closes any open tooltips
                marker.unbindTooltip();
                marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
            });
            circle.bindTooltip(toolTipContent, { permanent: true, direction: 'top' }).openTooltip();

            // Updates data when the bus is clicked on
            document.getElementById("busRoute").textContent = "Route: " + route;
            document.getElementById("busDestination").textContent = "Destination: " + destination;
            
            // Get the current time
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
            marker.bindTooltip(toolTipContent, { permanent: false, direction: 'top' });
        });
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

    getAllBusGPS(maxY, maxX, minY, minX);
}

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", function() {
    map = createMap();

    if(viewAllBuses===true) {
        map.on('moveend', updateViewportBounds); 
        map.on('zoomend', updateViewportBounds);
    } else {
        addRoute(encodedPolyline);
        getSpecificBusGPS(nocCode, gpsRoute);
    }
}); 
