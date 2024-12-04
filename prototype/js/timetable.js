/***
 * timetable script
 * @author Xavier Flockton
 * @version 2.1 4/12/2024
 */
var service;
var area;
var route;

document.addEventListener("DOMContentLoaded",setOperator)

// function to genenerate the options for different opperators
function setOperator() {
    service = document.getElementById("service").value;

    var selection = document.getElementById("selection");
    //if it is a stagecoach bus this link is to the page if its a first it generates the timetable in te
    if (service == "https://www.stagecoachbus.com/timetables") {
        selection.innerHTML = `<button class="btn btn-primary btn-lg mt-4 mb-4" onclick="generateLink()">Open Timetable</button>`;
    } else {
        selection.innerHTML = `
        <label for="area">Select area:</label>
        <select class="form-select form-select-lg mb-3" id="area">
            <option value="17">Aberdeen</option>
            <option value="9">Glasgow</option>
        </select>

        <label for="route">Bus service number:</label>
        <input class="form-control form-control-lg" type="text" id="route" placeholder="Enter your bus route number">

        <button class="btn btn-primary btn-lg mt-4 mb-4" onclick="generateLink()">Open Timetable</button>`;
    }
}

// function to generate the link to the page
function generateLink() {
    area = document.getElementById("area") ? document.getElementById("area").value : null;
    route = document.getElementById("route") ? document.getElementById("route").value : null;

    if (service == "https://www.stagecoachbus.com/timetables") {
        var finalURL = service;
        window.open(finalURL, '_blank').focus();
    } else {
        var finalURL = `${service}?opco=${area}&service=${route}&day=mf&print=pdf`;
        var pdfContainer = document.getElementById("pdfContainer");
        pdfContainer.innerHTML = `
            <iframe class="pdf" src="${finalURL}" title="Bus Timetable PDF"></iframe>
        `;
    }
}