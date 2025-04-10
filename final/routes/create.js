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
    res.render("pages/create",{page:"create"});
});




// -=-=-=-=-=-=-=-=-=Create User Account-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
router.post('/createUser', async function(req, res) {
    try {
        //Check if user is already logged in
        if (req.session.loggedin === true) {
        console.log("cannot create as Logged in:", req.session.loggedin);
        res.redirect('/login');
        return;
        
        }

        // Store user data from the form
        const datatostore = {
            "name": { "title": req.body.title, "first": req.body.first },
            "login": { "username": req.body.email, "password": req.body.password },
            "registered": new Date()
        };

        // Insert the new user into the database
        const result = await db.collection('users').insertOne(datatostore);
        console.log("Saved to database:", result.insertedId);


        console.log("Logged new user into their account ")

        res.redirect('/');

    } catch (error) {
        console.error("Error saving to database:", error);
        res.status(500).send("Failed to create account");
    }
});


//-=-=-=-=-=-=-=-=-=-=-=-=-===-=-Change Username =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\

//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Delete Account-=-=-=-=-=-=-=-=-=-===-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\\

//-=-=-=-=-=-==-=-=-=-=-=-=-=-=-logout button controls -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\

module.exports = router;