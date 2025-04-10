// settings.js

const express = require("express");
const router = express.Router();


router.use(express.urlencoded({ extended: true }));  // Parses form data
router.use(express.json());  // Parses JSON data

// MongoDB connection setup
const MongoClient = require("mongodb-legacy").MongoClient;
const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);
const dbName = "User_Profiles";
let db;


// Connect to database
async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("Settings page Connected to the database");
    } catch (error) {
        console.error("settings page Database connection failed", error);
    }
}
connectDB();

// SERVER ENDPOINT: create page
router.get("/", async function(req, res) {
    let userData = null;
    try {
        if (req.session.loggedin === true) {
            console.log("Logged in:", req.session.loggedin);

            userData = await db.collection('users').findOne({
                "login.username": req.session.thisuser
            });

            if (userData) {
                console.log("User found:", userData.login.username);
            }
        } else {
            console.log("Not logged in");
        }
    } catch (error) {
        console.error("Error fetching user:", error);
    }

    res.render("pages/settings", {
        page: "settings",
        user: userData,
        loggedIn: req.session.loggedin === true
    });
});

//Check if user is logged in 



//-=-=-=-=-=-=-=-=-=-=-=-=-===-=-Change Password =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\

//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Delete Account-=-=-=-=-=-=-=-=-=-===-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\\

//-=-=-=-=-=-==-=-=-=-=-=-=-=-=-logout button controls -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\

module.exports = router;