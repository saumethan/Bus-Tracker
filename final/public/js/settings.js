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

        // ✅ Define the section before trying to use it
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

    // Optional: live update of zoom level span
    $("#mapZoomRange").on("input", function () {
        $("#zoomValue").text($(this).val());
    });

});
