/***
 * timetable script
 * @author Xavier Flockton
 * @version 2.1 4/12/2024
 */


// function to generate the link to the page
async function ScrapeTimetable() {
    var date = $("#date").val();
    var route = $("#route").val();

    try {
        // Call our server endpoint 
        const response = await $.get(`/timetables/getTimetables?service=${route}&date=${date}`);
        return response;
    } catch (error) {
        console.error("Error fetching bus timetable data:", error);
    }
}