// Variables
let map;  
let route; 
let encodedPolyline = "wotzIrpsLJ^jB~EPRBBVBdByAtBaC^w@Po@Lu@FkACcA_AqLKwB?iFAm@]oDu@_HIcAGaBB_ABkAHcAaDgBQCIFaC~CoEeQKq@I_AIqHDk@Jk@b@qAPgADkBJqJkKYYMHm@jAeEtH{GHMBUQy]}AB[BoNRKIEg@oA`AW@]AWUwBkCkC_D{@{@eAy@_@U[?Qn@QjCg@xD[rAYl@c@j@URc@T_@JsOfAgHU{ADqFBqAIk@YUFMHELU\\_@?YMQc@Gk@?g@Fi@PYXULWL}BPoAX_AjBkCPo@PyA@cAEcAeC{PaEgRyDsNK_@kXkr@sAqCqBmDoAgBcBuBaBeBgEaDmCqAcCy@ai@_JkD}@wCcAuB_AmGwDaGaFc[q[}AqAk@a@_CcAwB_@kCMuBHaBXoGbBaBPkA?qAUm@So@a@gA_Ai@q@k@}@g@cAu@yBoCoK{@cC]y@m@cAg@o@g@e@m@a@q@_@o@Qm@IaBGsGXgB?}BMg[qDgASgKaCyAc@_DoAaCyAoAcA}B_Cy@gA{AaCyAkCy@gAUQWCk@^MTk@b@c@Dm@E]Y_AcBYUI?}@l@e@|@Qb@Q~@Gf@E`BRzF?fAEbAk@hGCh@BjBf@nIHjFN`KOfDEt@g@~DQx@g@hBf@iBPy@f@_EDu@NgDYmRg@oICkBBi@j@iGDcA?gAS{FDaBFg@P_APc@d@}@J[HgA?g@Jc@PSLCf@cAd@sAvAyCZy@Lu@Fu@?cAG}@Mu@_@w@c@o@g@[m@YeAnDAt@^rAtL`X|BxDbAvA`AfAtBxBjAz@fBbA~@\\~P`ECx@gKaCyAc@_DoAaCyAoAcA}B_Cy@gA{AaC_EqHuTcg@kB}Cg@o@eAkAs@i@qAy@yAm@}AYyBEuBHqGt@sCTuBDsBImBU}A[eDkA_[sO}BaAmB_@_DQqBLuZtEQDq@sVE{@QcAy@sCgHmSaGqY}C|CaErD}At@|Au@VUhD}C|C}CsNat@K[Wo@_@c@wAq@Sb@YP{@PmFLUFUPkB|CWZk@`@_AZeBf@NvNlCtNFnAPHFX?ZHNPb@nBzIoB{IQc@IOOTQBIUC[BQFQHCGoAmCuNOwNQ?m@ToEtCs@^kC|@[Py@lAiFdLkAbBmArA}AbAgBt@}AToBDcBU_Bc@oBmAgAkA}BeDaAmBu@}Bi@wBaD_K}CyHsBgEyBsDqAsBcH{Im@kAc@cA]y@Mu@MgAMk@_@WO_@?k@Pm@TGPHFNVPPH^GXSXa@R_ABm@CaASw@]y@g@u@[Q_@Q{Eo@qBi@cG}@cHyAaFyAyLwEsKsFw@UsEyB]ImGoDkCeAcBWiCYcAC_@Fg@C}KyDmB_@aBKgACkDTgGx@mCt@wD~AsC`BcHlEuDtBiBp@kEpAgBb@gBTeE\\kB@yT[oA?gC^kBf@cBx@eExBeAb@_B^}AFcBKgASsAk@{@k@gA_AiFiFuAu@}A[u@Gc@?UPQXIb@MPM?o@}@Q_BIOUSaBeC_LuS{EwM[gAKw@CGgMcIIBKFE?QUQQqE}AWCaALe@Tg@^aAhB_AlAYPcAXmAT}HhAEB}@jAoM`X_A`DCLGTIHI?GA[@OA{QiEcBg@kIqGc@WoOaz@`EuEL]Bg@qAsHU][c@GM?c@FYPe@V]XSPc@Bc@c@kB";


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
function addRoute(encodedPolyline) {
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

// Calls the initializeMap function when the HTML has loaded
document.addEventListener("DOMContentLoaded", function() {
    map = createMap();
    addRoute(encodedPolyline);
});
