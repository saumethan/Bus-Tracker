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
    service = $("#service").val();

    var selection = $("#selection");
    //if it is a stagecoach bus this link is to the page if its a first it generates the timetable in te
    if (service == "https://www.stagecoachbus.com/timetables") {
        selection.html(`<button class="btn btn-primary btn-lg mt-4 mb-4" onclick="generateLink()">Open Timetable</button>`);
        var pdfContainer = $("#pdfContainer");
        pdfContainer.html( ``)
    } else {
        selection.html( `
        <label for="area">Select area:</label>
        <select class="form-select form-select-lg mb-3" id="area">
            <option value="17">Aberdeen</option>
            <option value="9">Glasgow</option>
        </select>

        <label for="route">Bus service number:</label>
        <input class="form-control form-control-lg" type="text" id="route" placeholder="Enter your bus route number">

        <button class="btn btn-primary btn-lg mt-4 mb-4" onclick="generateLink()">Open Timetable</button>`);
    }
}

// function to generate the link to the page
function generateLink() {
    area = $("#area").val();
    route = $("#route").val();

    if (service == "https://www.stagecoachbus.com/timetables") {
        var finalURL = service;
        var pdfContainer = $("#pdfContainer");
        pdfContainer.html( ``)
        window.open(finalURL, '_blank').focus();
    } else {
        var finalURL = `${service}?opco=${area}&service=${route}&day=mf&print=pdf`;
        var pdfContainer = $("#pdfContainer");
        pdfContainer.html( `
            <iframe class="pdf" src="${finalURL}" title="Bus Timetable PDF"></iframe>
        `);
    }
}