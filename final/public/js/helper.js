function showNotification(message, type = "info", duration = 6000) {
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
    
    // Fade in
    setTimeout(() => {
        notification.fadeTo(300, 1);
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.fadeTo(300, 0, () => {
            notification.remove();
        });
    }, duration);
}

export { showNotification }