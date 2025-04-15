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
router.get("/", function(req, res) {
    const error = req.session.loginError;
    delete req.session.loginError;
    res.render("pages/login", { page: "login", loggedIn: req.session.loggedin, error: error });
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

router.post("/userlogin", async function(req, res) {
    var userName = req.body.uname;
    var userPass = req.body.upass;

    try {
        var result = await db.collection("users").findOne({
            "login.username": userName
        });

        if (!result) {
            req.session.loginError = "No user found with that name";
            return res.redirect("/login");
        }

        if (result.login.password === userPass) {
            req.session.loggedin = true;
            req.session.thisuser = userName;
            console.log("Logged in:", req.session.loggedin);
            res.redirect("/");
        } else {
            req.session.loginError = "Incorrect password, please try again";
            return res.redirect("/login");
        }
    } catch (error) {
        req.session.loginError = "Failed to log in at this time";
        return res.redirect("/login");
    }
});

module.exports = router;