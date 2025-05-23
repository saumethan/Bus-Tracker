/**
 * @author Ethan Saum @saumethan
 * @description server.js
 */

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
const createRoute = require("./routes/create");
const planRoute = require("./routes/routingApi")
const planJourney = require("./routes/routingApi")
const settings = require("./routes/settingsRoute");

// set the view engine to ejs
app.set("view engine", "ejs");

const port = 8080;
const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;

// SERVER ENDPOINT: index page 
app.get("/", async function(req, res) {
    // Detects if device is mobile or desktop
    const userAgent = req.get("User-Agent") || "";
    const isMobile = /mobile/i.test(userAgent);

    res.render("pages/index", { page: "map", loggedIn: req.session.loggedin===true, isMobile: isMobile });
    try {
        await axios.get(`${BASE_URL}/api/buses/startWebsocket`);
        console.log("WebSocket started and running in the background.");
    } catch (error) {
        console.error("Error starting WebSocket:", error);
    }
});

// Use the API routes (from apiRoutes.js)
app.use("/api/buses", busRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/busimages", imagesRoute);
app.use("/login", loginRoutes);
app.use("/create", createRoute)
app.use("/api/planroute", planRoute);
app.use("/api/planroute", planJourney);
app.use("/settings", settings);

// 404 page
app.use(function(req, res, next) {
    // Check if the route is an API route
    if (req.originalUrl.startsWith("/api")) {
        // Return a 404 JSON response for API routes
        return res.status(404).json({ error: "API endpoint not found" });
    }

    // Choose a random 404 image
    const images = [
        "https://i.ibb.co/Xfvg9nZ0/img1.gif",
        "https://i.ibb.co/GQw14xbV/img2.jpg",
        "https://i.ibb.co/CptDwVqn/img3.jpg",
    ];
    const randomImagePicker = images[Math.floor(Math.random() * images.length)];

    // Render 404 page for other routes
    res.status(404).render("pages/404", { image: randomImagePicker });
});

//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
app.listen(port);
console.log("8080 is the magic ", port);
