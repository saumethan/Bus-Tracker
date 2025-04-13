/**
 * @author Ethan Saum @saumethan
*/

$(document).ready(function () {

    // Toggle visibility of form sections
    $("[data-toggle-section]").on("click", function () {
        const sectionId = $(this).data("toggle-section");
        $("#" + sectionId).slideToggle();
    });

    // Handle zoom form submission
    $("#zoomSettingsForm").on("submit", function (event) {
        event.preventDefault();

        const zoomLevel = $("#mapZoomRange").val();
        console.log("Saving Zoom Level:", zoomLevel);
        saveMapZoomSetting(zoomLevel);

        const $section = $("#mapZoomForm");
        $section.slideUp(); // Collapse the section
    });

    // Handle location form submission
    $("#locationSettingsForm").on("submit", function (event) {
        event.preventDefault();
        const location = $("#defaultLocation").val();
        console.log("Saving Default Location:", location);
        saveDefaultLocation(location);
    });

    $("#mapZoomRange").on("input", function () {
        $("#zoomValue").text($(this).val());
    });

    (async function setInitialZoomLevel() {
        const zoomLevel = await getUserZoom();
        if (zoomLevel !== undefined && !isNaN(zoomLevel)) {
            $("#mapZoomRange").val(zoomLevel);
        }
    })();
});

async function saveMapZoomSetting(zoom) {
    try {
        const response = await $.ajax({
            type: "POST",
            url: "/settings/userSettings",
            contentType: "application/json",
            data: JSON.stringify({ newZoom: zoom }),
        });

        console.log("Zoom setting sent to server:", zoom);
        console.log("Server response:", response);
    } catch (error) {
        console.error("Failed to save zoom setting:", error);
    }
}


function saveDefaultLocation(location) {
    console.log("Location setting sent to server:", location);
}

async function getUserZoom() {
    try {
        const response = await fetch("settings/userSettings");
        if (response.ok) {
            const data = await response.json();
            if (data.zoomLevel !== undefined && !isNaN(data.zoomLevel)) {
                return data.zoomLevel;
            }
        }
    } catch (err) {
        return 15;
    }
}
