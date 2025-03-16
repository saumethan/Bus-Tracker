/**
 * @author Ethan Saum @saumethan272
 * @description All functionality relating to user cookies.
 */


// Variables
let cookieStorageEnabled = false;

// ------------------ Functions to set a cookie ------------------
function setCookie(name, value, days) {
    if (!cookieStorageEnabled) {
        console.log("Cookie storage disabled");
        return false;
    }
    
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + value + ";expires=" + expires.toUTCString() + ";path=/";
    return true;
}

// ------------------ Functions to get a cookie ------------------
function getCookie(name) {
    if (!cookieStorageEnabled && localStorage.getItem("cookieAlertStatus") !== "accepted") {
        console.log("Cookies not accepted");
        return null;
    }
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// ------------------ Function to disable cookie storage ------------------
function disableCookieStorage() {
    cookieStorageEnabled = false;
    console.log("Cookie storage disabled");
}

// ------------------ Function to enable cookie storage ------------------
function enableCookieStorage() {
    cookieStorageEnabled = true;
    console.log("Cookie storage enabled");
}

// ------------------ Function to check if cookies are enabled ------------------
function areCookiesEnabled() {
    return cookieStorageEnabled;
}

// ------------------ Function to initialize cookie storage based on user preference ------------------
function initializeCookieStorage() {
    const cookieStatus = localStorage.getItem("cookieAlertStatus");
    
    if (cookieStatus === "accepted") {
        enableCookieStorage();
    } else {
        disableCookieStorage();
    }
    
    return cookieStatus;
}

// ------------------ Function for cookie alert bar ------------------
function setupCookieBar() {
    let alertBox = document.querySelector(".cookiealert");
    let acceptBtn = document.querySelector(".acceptcookies");
    let rejectBtn = document.querySelector(".rejectcookies");

    // Check if cookies were already accepted or rejected
    const cookieStatus = localStorage.getItem("cookieAlertStatus");
    
    if (cookieStatus === "accepted" || cookieStatus === "rejected") {
        alertBox.style.display = "none";
    }

    // Accept button functionality
    acceptBtn.addEventListener("click", function() {
        localStorage.setItem("cookieAlertStatus", "accepted");
        alertBox.style.display = "none"; 
        enableCookieStorage(); 
        
        document.dispatchEvent(new CustomEvent("cookiesAccepted"));
    });

    // Reject button functionality
    rejectBtn.addEventListener("click", function() {
        localStorage.setItem("cookieAlertStatus", "rejected"); 
        alertBox.style.display = "none"; 
        disableCookieStorage(); 
        
        document.dispatchEvent(new CustomEvent("cookiesRejected"));
    });
}

export { setCookie, getCookie, enableCookieStorage, disableCookieStorage, areCookiesEnabled, initializeCookieStorage, setupCookieBar };