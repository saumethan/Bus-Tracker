/**
 * @author Ethan Saum @saumethan
 */

// jQuery document ready
$(document).ready(function () {

    //Toggle visibility of any section via data-toggle-section
    $("[data-toggle-section]").on("click", function () {
        const sectionId = $(this).data("toggle-section");
        $("#" + sectionId).slideToggle();
    });

    //MAP SETTINGS

    // Show current zoom value as user slides
    $("#mapZoomRange").on("input", function () {
        $("#zoomValue").text($(this).val());
    });

    // Submit zoom settings form
    $("#zoomSettingsForm").on("submit", function (event) {
        event.preventDefault();

        const zoomLevel = $("#mapZoomRange").val();
        console.log("Saving Zoom Level:", zoomLevel);

        saveMapZoomSetting(zoomLevel);
        $("#mapZoomForm").slideUp(); // Collapse section after save
    });

    // Load initial zoom setting on page load
    (async function setInitialZoomLevel() {
        const zoomLevel = await getUserZoom();
        if (zoomLevel !== undefined && !isNaN(zoomLevel)) {
            $("#mapZoomRange").val(zoomLevel);
        }
    })();


    //ACCOUNT MANAGER FORMS

    // Log Out
    $("#logoutForm form").on("submit", function (event) {
        event.preventDefault();

        $.post("/settings/logout", $(this).serialize())
            .done(function () {
                alert("Logged out successfully.");
                window.location.href = "/";
            })
            .fail(function () {
                alert("Logout failed. Please try again.");
            });
    });

    // Change Password
    $("#passwordForm form").on("submit", function (event) {
        event.preventDefault();

        const oldPass = $("#oldpass").val().trim();
        const newPass = $("#newpassword").val().trim();
        const confirmPass = $("#confirmpass").val().trim();

        if (newPass !== confirmPass) {
            alert("New passwords do not match.");
            return;
        }

        $.post("/settings/changepassword", {
            oldpassword: oldPass,
            newpassword: newPass,
            confirmpassword: confirmPass
        })
        .done(function () {
            alert("Password changed successfully.");
            $("#passwordForm form")[0].reset();
            $("#passwordForm").slideUp();
        })
        .fail(function () {
            alert("Failed to change password.");
        });
    });

    // Delete Account
    $("#deleteAccountForm form").on("submit", function (event) {
        event.preventDefault();

        const inputVal = $("#confirmDelete").val().trim();
        if (inputVal !== "DELETE") {
            alert('You must type "DELETE" to confirm.');
            return;
        }

        $.post("/settings/deleteaccount", $(this).serialize())
            .done(function () {
                alert("Account deleted successfully.");
                window.location.href = "/goodbye";
            })
            .fail(function () {
                alert("Failed to delete account.");
            });
    });
});


//Save map zoom level via AJAX
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

//Fetch user's saved zoom level from server
async function getUserZoom() {
    try {
        const response = await $.get("/settings/userSettings");
        if (response.ok) {
            const data = await response.json();
            if (data.zoomLevel !== undefined && !isNaN(data.zoomLevel)) {
                return data.zoomLevel;
            }
        }
    } catch (err) {
        console.warn("Failed to fetch user zoom. Using default (15).");
    }

    return 15;
}
