/**
 * Disables the iOS Magnifier when you double tap on the screen.
 * There is no text that can be magnified properly in the site so it's worth doing this.
 * 
 * @author Owen Meade @owenrgu
 */

// Functions
function ignore(e) {
    e.preventDefault();
}

// Main
document.body.addEventListener("touchcancel", ignore, { passive: false });
document.body.addEventListener("touchend", ignore, { passive: false });