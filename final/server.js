// server.js
// load the things we need
const express = require("express");
const app = express();
const axios = require("axios");

app.use(express.static("public"));

// Import API routes 
const busRoutes = require("./routes/busRoutes");

// set the view engine to ejs
app.set("view engine", "ejs");

// use res.render to load up an ejs view file

// SERVER ENDPOINT: index page 
app.get("/", function(req, res) {
    // Pass any query parameters to the view
    const busRoute = req.query.bus || null;
    res.render("pages/index", {
        busRoute: busRoute
    });
});

// SERVER ENDPOINT: login page
app.get("/login", function(req, res) {
    res.render("pages/login");
});

// SERVER ENDPOINT: settings page
app.get("/settings", function(req, res) {
    res.render("pages/settings");
});

// SERVER ENDPOINT: timetable page
app.get("/timetable", function(req, res) {
    res.render("pages/timetable");
});

// Use the API routes (from apiRoutes.js)
app.use("/api/buses", busRoutes);

// 404 page
app.use(function(req, res, next) {
    // Check if the route is an API route
    if (req.originalUrl.startsWith("/api")) {
        // Return a 404 JSON response for API routes
        return res.status(404).json({ error: "API endpoint not found" });
    }

    // Render 404 page for other routes
    res.status(404).render("pages/404");
});

app.listen(8080);
console.log("8080 is the magic port");