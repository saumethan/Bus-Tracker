const express = require("express");
const router = express.Router();

// MongoDB connection
const MongoClient = require("mongodb-legacy").MongoClient;
const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);
const dbName = "User_Profiles";
let db;

router.use(express.urlencoded({ extended: true }));  // Parses form data
router.use(express.json());  // Parses JSON data

// SERVER ENDPOINT: login page
router.get("/", function(req, res) {
    res.render("pages/login",{page:"login", loggedIn: req.session.loggedin===true });
});


async function connectDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log("login page Connected to the database");
    } catch (error) {
        console.error("login page Database connection failed", error);
    }
}
connectDB();

router.post('/userlogin', async function(req, res) {
    var userName = req.body.uname;
    var userPass = req.body.upass;

    try {
        var result = await db.collection('users').findOne({
            "login.username": userName
        });

        if (!result) {
            //console.log("No User Found");
            //return res.status(401).send("No User with that name found");
            res.render("pages/login", {
                page: "login",
                loggedIn: false,
                error: "No user found with that name"
            });
        }

        if (result.login.password === userPass) {
            req.session.loggedin = true;
            req.session.thisuser = userName;
            console.log("Logged in:", req.session.loggedin);
            res.redirect('/');
        } else {
            //console.log("Incorrect Password");
            //res.status(401).send("Incorrect Password, please try again");
            console.error("Password Error", error);
            res.render("pages/login", {
                page: "login",
                loggedIn: false,
                error: "Incorrect password, please try again"
            });
        }
    } catch (error) {
        //console.error("Login Error", error);
        //res.status(500).send("Failed to log in at this time");
        res.render("pages/login", {
            page: "login",
            loggedIn: false,
            error: "Failed to log in at this time"
        });
    }
});
//Ethans settings for zoom level
router.post('/userSettings', async function(req, res) {
    if (!req.session || !req.session.loggedin) {
        return res.status(401).send("Unauthorized: Please log in first.");
    }

    const newZoom = parseInt(req.body.newZoom, 10);
    const username = req.session.thisuser;

    if (isNaN(newZoom) || newZoom < 1 || newZoom > 30) {
        return res.status(400).send("Invalid zoom level.");
    }

    try {
        const result = await db.collection('users').updateOne(
            { "login.username": username },
            { $set: { zoomLevel: newZoom } }
        );

        if (result.modifiedCount === 1) {
            console.log(`Zoom level updated to ${newZoom} for ${username}`);
            res.status(200).send("Zoom level updated.");
        } else {
            res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Login Error", error);
        res.render("pages/login", {
            page: "login",
            loggedIn: false,
            error: "Something went wrong. Please try again later."
        });
    }
});

router.get('/userSettings', async function(req, res) {
    if (!req.session || !req.session.loggedin) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const username = req.session.thisuser;

    try {
        const user = await db.collection('users').findOne({ "login.username": username });

        if (user && user.zoomLevel !== undefined) {
            res.status(200).json({ zoomLevel: user.zoomLevel });
        } else {
            res.status(404).json({ error: "Zoom level not found" });
        }
    } catch (error) {
        console.error("Error retrieving zoom level:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
