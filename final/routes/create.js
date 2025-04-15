/**
 * @author Joshua Newton
 * @description Create.js
 */

// create.js

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
        console.log("create account page Connected to the database");
    } catch (error) {
        console.error(" create account page Database connection failed", error);
    }
}
connectDB();

// SERVER ENDPOINT: create page
router.get("/", function(req, res) {
    // Check if user is already logged in
    if (req.session.loggedin === true) {
        return res.redirect("/");
    }
    const error = req.session.createError;
    delete req.session.createError;
    res.render("pages/create", { page:"create", loggedIn: req.session.loggedin === true, error: error });
});

// -=-=-=-=-=-=-=-=-=Create User Account-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
router.post("/createUser", async function(req, res) {
    if (req.session.loggedin === true) {
        return res.redirect("/login");
    }

    try {
        // Check if the user already exists
        const email = req.body.email.trim();
        const existingUser = await db.collection("users").findOne({ "login.username": email });

        if (existingUser) {
            req.session.createError = "An account with this email already exists.";
            return res.redirect("/create");
        }

        // Store user data from the form
        const dataToStore = {
            "name": { "first": req.body.first, "last": req.body.last || "" },
            "login": { "username": req.body.email, "password": req.body.password },
            "registered": new Date(),
            "zoomLevel": 15
        };

        try {
            // Insert the new user into the database
            const result = await db.collection("users").insertOne(dataToStore);
            console.log("Saved new user to database:", result.insertedId);

            // When a new user is created it will automatically log them into the account 
            req.session.loggedin = true;
            req.session.thisuser = req.body.email;
            console.log("Logged new user into their account");

            res.redirect("/");
        } catch (err) {
            res.redirect("/login");
        }
    } catch (error) {
        req.session.createError = "Failed to create account";
        return res.redirect("/create");
    }
});

module.exports = router;