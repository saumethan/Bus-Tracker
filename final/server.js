// server.js
// load the things we need

const express = require("express");
const app = express();
const axios = require("axios");
const session = require("express-session");
const bodyParser = require("body-parser");

// Set up static file serving
app.use(express.static("public"));
app.use(session({ secret : "example" }));
//app.use(bodyParser.urlencoded({ extended: true }));

// Import API routes 
const busRoutes = require("./routes/busRoutesApi");
const stopRoutes = require("./routes/stopRoutesApi");
const imagesRoute = require("./routes/busImagesApi");
const loginRoutes = require("./routes/login");
const timetableRoutes = require("./routes/timetables");
const createRoute = require("./routes/create")

// set the view engine to ejs
app.set("view engine", "ejs");

// SERVER ENDPOINT: index page 
app.get("/", function(req, res) {
    // Pass query parameters to the view
    const busRoute = req.query.bus || null;
    res.render("pages/index");
});

// SERVER ENDPOINT: settings page
app.get("/settings", function(req, res) {
    res.render("pages/settings");
});

// Use the API routes (from apiRoutes.js)
app.use("/api/buses", busRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/busimages", imagesRoute);
app.use("/login", loginRoutes);
app.use("/timetable", timetableRoutes);
app.use("/create", createRoute)

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

//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
app.listen(8080);
console.log("8080 is the magic port");