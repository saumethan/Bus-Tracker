// server.js
// load the things we need

const MongoClient = require('mongodb-legacy').MongoClient
const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url)
const dbName = 'User_Profiles'

//Connect the user to the database
async function connectDB() {
    try{
        await client.connect()
        db = client.db(dbName)
        console.log("Connected to the database")
    }catch(error){
        console.error("Database connection failed",error)
    }
}
connectDB()


const bodyParser = require('body-parser')
const express = require("express");
const session = require('express-session')
const app = express();
const axios = require("axios");
const cheerio = require('cheerio');

app.use(express.static("public"));




// Import API routes 
const busRoutes = require("./routes/busRoutesApi");
const stopRoutes = require("./routes/stopRoutesApi");

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
app.use("/api/stops", stopRoutes);

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

// web scraper

(async () => {
    const url = 'https://bustimes.org/services/57466/timetable?date=2025-03-15';
    const response = await fetch(url);
  
    const $ = cheerio.load(await response.text());
    console.log($.html());
  
  })();














//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-Login Page Code-=-=-=-=-=-=-=-=-=-=-=-=--=\\
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\




app.use(session({secret : 'example'}))
app.use(express.static('public'))

app.use(bodyParser.urlencoded({
    extended: true
}))




//User creating account 
app.post('/login', function(req,res){
    console.log("Username : "+ req.body.userEmail)
    console.log("Password : "+ req.body.userPass)

    if(!db){
        console.error("Database not connected")
        return res.status(500).send("Database connection error")
    }

    db.collection("users").insertOne({
        email: req.body.userEmail,
        password: req.body.userPass
    });

    dbName.collection(User_Profiles).insertOne(req.body, function(err, results){
        if(err) throw err;
        console.log("Saved to database")
        res.redirect('/')
    })

})




//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
app.listen(8080);
console.log("8080 is the magic port");