/**
 * @author Owen Meade @owenrgu
 * @description Allows mobile users to resize the bus-data panel
 */

// Variables
let panelOpen = false;

// Functions
function updateMapHeight() {
    if ($(window).width() <= 652) {
        // update map height when panel height changes
        const asideHeight = $("aside.col-md-3").height();
        $("#map").height(`calc(100vh - 80px - ${asideHeight}px)`);
    }
}

function popupPanel() {
    if ($(window).width() <= 652) {
        if (panelOpen) return;
        panelOpen = true;
        $("aside.col-md-3").height("300px");
        updateMapHeight();
    }
}

function closePanel(force) {
    if ($(window).width() <= 652) {
        if (!panelOpen && !force) return;
        panelOpen = false;
        $("aside.col-md-3").height("45px");
        updateMapHeight();
    }
}

// Main
$(document).ready(function() {
    // only apply this code to mobile devices
    if ($(window).width() <= 652) {
        // variables for tracking resize
        let startY, startHeight;

        // add event listeners to the top part of the aside panel
        $("aside.col-md-3").mousedown(function(e) { 
            if (e.clientY - $("aside.col-md-3").offset().top < 20) { // only trigger the code if the user is clicking at the top edge
                startResize(e.clientY);
                $(document).mousemove(resizeMove);
                $(document).mouseup(resizeEnd);
            }
        });

        $("aside.col-md-3").on("touchstart", function(e) {
            if (e.originalEvent.touches[0].clientY - $("aside.col-md-3").offset().top < 20) { // only trigger the code if the user is touching at the top edge
                startResize(e.originalEvent.touches[0].clientY);
                $(document).on("touchmove", resizeTouchMove); // using .on as can't find a jquery method for .touchmove
                $(document).on("touchend", resizeEnd); // using .on as can't find a jquery method for .touchend
                //e.preventDefault();
            }
        });

        // functions to resize the bus-data panel
        function startResize(y) {
            startY = y;
            startHeight = $("aside.col-md-3").height();
            $("aside.col-md-3").css("transition", "none");
            $("#map").css("transition", "none");
        }

        function resizeMove(e) {
            const currentY = e.clientY;
            const deltaY = startY - currentY;
            let newHeight = Math.max(45, Math.min(startHeight + deltaY, $(window).height() * 0.95));
            $("aside.col-md-3").height(newHeight);
            panelOpen = (newHeight !== 45); // if newHeight is 45, panel is closed, otherwise it is open
            updateMapHeight();
            //e.preventDefault();
        }

        function resizeTouchMove(e) {
            const currentY = e.originalEvent.touches[0].clientY;
            const deltaY = startY - currentY;
            let newHeight = Math.max(45, Math.min(startHeight + deltaY, $(window).height() * 0.95));
            $("aside.col-md-3").height(newHeight);
            panelOpen = (newHeight !== 45); // if newHeight is 45, panel is closed, otherwise it is open
            updateMapHeight();
            //e.preventDefault();
        }

        function resizeEnd() {
            // remove event handlers https://api.jquery.com/off/
            $(document).off("mousemove", resizeMove);
            $(document).off("touchmove", resizeTouchMove);
            $(document).off("mouseup", resizeEnd);
            $(document).off("touchend", resizeEnd);

            // re-enable transitions
            $("aside.col-md-3").css("transition", "height 0.2s ease");
            $("#map").css("transition", "height 0.2s ease");
        }

        // initialize map
        closePanel(true);

        // update on window resize
        $(window).on("resize", function() {
            if ($(window).width() <= 652) {
                updateMapHeight();
            } else {
                // reset heights if switching to desktop
                $("#map").css("height", "");
                $("aside.col-md-3").css("height", "");
            }
        });
    }
});

export { updateMapHeight, popupPanel, closePanel };