// web scraper
const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");

(async () => {
    const url = "https://bustimes.org/services/57466/timetable?date=2025-03-15";
    const response = await fetch(url);
    const $ = cheerio.load(await response.text());
    //console.log($.html());
})();

// SERVER ENDPOINT: timetable page
router.get("/", function(req, res) {
    res.render("pages/timetable");
});

module.exports = router;