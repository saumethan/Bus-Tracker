// web scraper
const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");
const axios = require("axios");



async function scrapeTimetable(service, date) {
    try {
        const url = `https://bustimes.org/services/${service}/timetable${date ? `?date=${date}` : ""}`;
        
        // Fetch data using axios
        const response = await axios.get(url);
        if (!response.ok) throw new Error(`Failed to fetch timetable (status: ${response.status})`);

        const html = await response.text();
        const $ = cheerio.load(html);
        
        let timetable = [];
        
        $("table").each((i, table) => {
            const routeName = $("h1").text().trim() || `Route ${i + 1}`;
            const timeHeadings = [];
            const journeys = [];

            $(table).find("thead tr th").each((_, th) => {
                timeHeadings.push($(th).text().trim());
            });

            $(table).find("tbody tr").each((_, tr) => {
                const stop = $(tr).find("th:first-child, td:first-child").text().trim();
                const times = [];

                $(tr).find("td").each((_, td) => {
                    times.push($(td).text().trim());
                });

                if (stop || times.some(t => t)) {
                    journeys.push({ stop, times });
                }
            });

            if (journeys.length > 0) {
                timetable.push({ route: routeName, timeHeadings, journeys });
            }
        });

        return { service, date: date || "today", timetable };
    } catch (error) {
        return { error: "Failed to scrape timetable", message: error.message };
    }
}

// API Route
router.get("/", async (req, res) => {
    const { service, date } = req.query;

    if (!service) {
        return res.status(400).json({ error: "Service ID is required" });
    }

    const result =  scrapeTimetable("3353","2025-03-21");
    console.log(result);
    res.json(result);
});


module.exports = router;