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

        // Get the HTML content
        const html = response.data;
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

// Route for rendering the timetable page
router.get("/", async (req, res) => {
    res.render("pages/timetables");
});

// API Route to fetch timetable data
router.get("/getTimetables", async (req, res) => {
    const { service, date } = req.query;

    if (!service) {
        return res.status(400).json({ error: "Service ID is required" });
    }

    try {
        const result = await scrapeTimetable(service, date);
        console.log(result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

module.exports = router;