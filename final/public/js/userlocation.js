/**
 * @author Ethan Saum @saumethan272
 * @author Owen Meade @owenrgu
 * @description All functionality the users location.
 */

import { setCookie, getCookie, areCookiesEnabled } from "./cookies.js";

// Default location coordinates (Aberdeen)
const DEFAULT_LAT = 57.14912368784818;
const DEFAULT_LNG = -2.0980214518088967;

// Variables
let userLat = DEFAULT_LAT;
let userLng = DEFAULT_LNG;
let userLocationFlag = false;
let userLocationMarker = null;

// ------------------ Function to save user's location to cookie ------------------
function saveLocationToCookie() {
    if (!areCookiesEnabled()) {
        //console.log("Location cookie storage disabled: waiting for user consent");
        return false;
    }
    
    if (userLat && userLng) {
        // Store lat and lng as string
        const locationString = `${userLat.toFixed(6)},${userLng.toFixed(6)}`;
        return setCookie("lastUserLocation", locationString, 30); // 30 days
    }
    return false;
}

// ------------------ Function to load user's location from cookie ------------------
function loadLocationFromCookie() {
    const savedLocation = getCookie("lastUserLocation");
    if (savedLocation) {
        const [lat, lng] = savedLocation.split(",").map(coord => parseFloat(coord));
        if (!isNaN(lat) && !isNaN(lng)) {
            userLat = lat;
            userLng = lng;
            return true;
        }
    }
    return false;
}

// ------------------ Function to set default user location ------------------
function setDefaultUserLocation() {
    const cookieStatus = localStorage.getItem("cookieAlertStatus");
    if (cookieStatus === "rejected") {
        userLat = DEFAULT_LAT;
        userLng = DEFAULT_LNG;
        return false;
    } else if (!loadLocationFromCookie()) {
        // Fall back to default location if cookie doesn't exist
        userLat = DEFAULT_LAT;
        userLng = DEFAULT_LNG;
        return false;
    }
    return true;
}

// ------------------ Function to get the users location ------------------
function getUserLocation() {
    return new Promise((resolve, reject) => {
        // Set default location first
        setDefaultUserLocation();
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    userLat = position.coords.latitude;
                    userLng = position.coords.longitude;
                    userLocationFlag = true;
                    
                    // Try to save to cookie if enabled
                    saveLocationToCookie();
                    
                    resolve({ lat: userLat, lng: userLng });
                },
                error => {
                    console.error("Geolocation error:", error);
                    resolve({ lat: userLat, lng: userLng });
                },
                { maximumAge: 60000, timeout: 10000, enableHighAccuracy: true }
            );
        } else {
            // If geolocation not supported, resolve with default
            resolve({ lat: userLat, lng: userLng });
        }
    });
}

// ------------------ Function to draw the users location on map ------------------
function drawUserLocation(map) {
    if(!map) return;
    
    if(userLocationFlag) {
        // Draw icon
        const userIcon = L.divIcon({
            className: "user-location-marker",
            iconSize: [18, 18],
        });
        
        // Remove the existing marker if it exists
        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
        }
        
        // Add the new marker with the custom icon
        userLocationMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    }
}

// ------------------ Function to handle user location tracking ------------------
function initUserLocationTracking(map) {
    if(!map) return;
    
    // First try to load location from cookie or set default
    setDefaultUserLocation();
    
    drawUserLocation(map);
    
    // Center map on current location
    map.setView([userLat, userLng], map.getZoom());
    
    // Get actual location and update
    getUserLocation().then(location => {
        drawUserLocation(map);
        
        if (!map.userHasPanned) {
            map.setView([userLat, userLng], map.getZoom());
        }
    }).catch(error => {
        console.error("Error getting user location:", error);
    });
    
    // Refresh location every 30 seconds
    setInterval(() => {
        getUserLocation().then(() => {
            drawUserLocation(map);
        }).catch(error => {
            console.error("Error refreshing user location:", error);
        });
    }, 30000);
    
    // Listener for device movement 
    if (navigator.geolocation && "watchPosition" in navigator.geolocation) {
        navigator.geolocation.watchPosition(
            position => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                drawUserLocation(map);
                saveLocationToCookie();
            },
            error => {
                console.error("Watch position error:", error);
            },
            { enableHighAccuracy: true, maximumAge: 30000 }
        );
    }
    
    // Listeners for cookie status changes
    document.addEventListener("cookiesAccepted", () => {
        saveLocationToCookie();
    });
}

// ------------------ Function to get user's current coordinates ------------------
function getUserCoordinates() {
    return { lat: userLat, lng: userLng };
}

export { getUserLocation, drawUserLocation, initUserLocationTracking, setDefaultUserLocation, saveLocationToCookie, loadLocationFromCookie, getUserCoordinates, DEFAULT_LAT, DEFAULT_LNG };