/**
 * @author Joshua Newton
 * @description Login.js
 */

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
router.get("/login", function(req, res) {
    res.render("pages/login", { page: "login", loggedIn: req.session.loggedin });
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

// Handle the form submission (POST request to /login)
router.post("/login", async function(req, res) {
    var userName = req.body.uname;
    var userPass = req.body.upass;

    try {
        var result = await db.collection("users").findOne({
            "login.username": userName
        });

        if (!result) {
            return res.render("pages/login", {
                page: "login",
                loggedIn: false,
                error: "No user found with that name"
            });
        }

        if (result.login.password === userPass) {
            req.session.loggedin = true;
            req.session.thisuser = userName;
            console.log("Logged in:", req.session.loggedin);
            res.redirect("/");  // Redirect to home page after login
        } else {
            return res.render("pages/login", {
                page: "login",
                loggedIn: false,
                error: "Incorrect password, please try again"
            });
        }
    } catch (error) {
        return res.render("pages/login", {
            page: "login",
            loggedIn: false,
            error: "Failed to log in at this time"
        });
    }
});

module.exports = router;
