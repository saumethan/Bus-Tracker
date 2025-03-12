let isNotificationActive = false;  // Flag to track active notifications

function showNotification(message, type = "info", duration = 6000) {
    // Check if we should show the message as an alert (e.g., "Zoom in to view buses")
    if (message === "Zoom in to view buses" && isNotificationActive) {
        return;  // If a similar notification is already active, do nothing
    }

    // If a notification is already active, remove it before adding a new one
    if (isNotificationActive) {
        $("#notification-container .notification").remove();
        isNotificationActive = false;
    }

    // Check if notification container exists, if not create it
    let container = $("#notification-container");
    
    if (container.length === 0) {
        container = $("<div id='notification-container'></div>");
        $("body").append(container);
    }
    
    // Create notification element
    const notification = $("<div></div>")
        .addClass(`notification notification-${type}`)
        .text(message)
        .css("opacity", "0");
    
    // Add to container
    container.append(notification);

    // If the message is "Zoom in to view buses", set a flag to prevent it from disappearing
    if (message === "Zoom in to view buses") {
        isNotificationActive = true;
    }

    // Fade in
    setTimeout(() => {
        notification.fadeTo(300, 1);
    }, 10);
    
    // Remove after duration, unless it's the "Zoom in to view buses" message
    if (message !== "Zoom in to view buses") {
        setTimeout(() => {
            notification.fadeTo(300, 0, () => {
                notification.remove();
                isNotificationActive = false;  // Reset flag when the notification is removed
            });
        }, duration);
    }
}

export { showNotification };  // Export the function so it can be imported in other files
