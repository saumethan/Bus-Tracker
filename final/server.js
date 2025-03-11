// server.js
// load the things we need
const express = require("express");
const app = express();
const axios = require("axios");

app.use(express.static("public"));

// Import API routes 
const apiRoutes = require("./routes/apiRoutes");

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
app.use("/api", apiRoutes);

app.listen(8080);
console.log("8080 is the magic port");