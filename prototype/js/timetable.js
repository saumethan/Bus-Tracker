function generateLink() {

    var service = document.getElementById("service").value;
    var area = document.getElementById("area").value;
    var route = document.getElementById("route").value;



    var finalURL = `${service}?opco=${area}&service=${route}&day=mf&print=pdf`;

    var pdfContainer = document.getElementById("pdfContainer");
    pdfContainer.innerHTML = `
        <iframe class = "pdf" src="${finalURL}" title="Bus Timetable PDF"></iframe>
    `;
}