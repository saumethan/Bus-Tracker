// web scraper
const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");
const axios = require("axios");

async function scrapeTimetable(service, date) {
    try {
        const url = `https://bustimes.org/services/${service}/timetable?date=${date}`;
        console.log(url);

        // Fetch data using axios
        const response = await axios.get(url);

        // Get the HTML content
        const html = response.data;
        const $ = cheerio.load(html);
        console.log(html)
        let timetable = [];

        $("table").each((i, table) => {
            let route = $("h1").text().trim() || `Route ${i + 1}`;
            let headers = $(table).find("thead th").map((_, th) => $(th).text().trim()).get();
            let journeys = [];

            $(table).find("tbody tr").each((_, tr) => {
                let stop = $(tr).find("th a").text().trim() || $(tr).find("th").text().trim();
                let times = $(tr).find("td").map((_, td) => $(td).text().trim()).get().filter(Boolean);

                if (stop || times.length) journeys.push({ stop, times });
            });

            if (journeys.length) timetable.push({ route, headers, journeys });
        });

        return { service, date, timetable };

    } catch (error) {
        console.error("Scraping error:", error.message);
        return { error: "Failed to fetch timetable", message: error.message };
    }
}

// Route for rendering the timetable page
router.get("/", async (req, res) => {
    res.render("pages/timetable", { page: "timetable" });
});

// API Route to fetch timetable data
router.get("/getTimetables", async (req, res) => {
    const { service, date } = req.query;
    console.log("route hit")

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