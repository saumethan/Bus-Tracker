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
    //Check if user is already logged in
    if (req.session.loggedin === true) {
        console.log("cannot create as Logged in:", req.session.loggedin);
        res.redirect("/");
        return;
    }
    res.render("pages/create",{page:"create", loggedIn: req.session.loggedin===true});
});

// -=-=-=-=-=-=-=-=-=Create User Account-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
router.post("/createUser", async function(req, res) {
    try {
        const email = req.body.email.trim();
        
        // Check if the user already exists
        const existingUser = await db.collection("users").findOne({ "login.username": email });

        if (existingUser) {
            return res.render("pages/create", {
                page: "create",
                loggedIn: false,
                error: "An account with this email already exists."
            });
        }

        // Store user data from the form
        const datatostore = {
            "name": { "title": req.body.title, "first": req.body.first },
            "login": { "username": req.body.email, "password": req.body.password },
            "registered": new Date(),
            "zoomLevel": 15
        };

        // Insert the new user into the database
        const result = await db.collection("users").insertOne(datatostore);
        console.log("Saved to database:", result.insertedId);
        let test = true
        
        //when a new user is created it will automatically log them into the account 
        
        if (test === true) {
            req.session.loggedin = true;
            req.session.thisuser = username = req.body.email;
            console.log("Logged in:", req.session.loggedin);
            console.log("Logged new user into their account ")
            res.redirect("/");
        }else{
            res.redirect("/login");
        }
    } catch (error) {
        //console.error("Error saving to database:", error);
        //res.status(500).send("Failed to create account");
        return res.render("pages/create", {
            page: "create",
            loggedIn: false,
            error: "Failed to create account"
        });
    }
});

module.exports = router;