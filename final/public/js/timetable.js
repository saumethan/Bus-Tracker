/***
 * timetable script
 * @author Xavier Flockton
 * @version 2.1 4/12/2024
 */




document.getElementById("scrape").addEventListener("click", async function() {

    let date = $("#date").val();
    
    let route = $("#route").val();

    try {
        const url = `/timetable/getTimetables?service=${route}&date=${date}`
        console.log(url)
        const response = await $.get(url);
        return response;
    } catch (error) {
        console.error("Error fetching bus timetable data:", error);
    }
});
