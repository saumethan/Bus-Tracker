// login.js 

const express = require("express");
const router = express.Router();

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
        console.log("Connected to the database");
    } catch (error) {
        console.error("Database connection failed", error);
    }
}
connectDB();

// SERVER ENDPOINT: login page
router.get("/", function(req, res) {
    res.render("pages/login");
});

//User creating account 
router.post("/login", function(req,res){
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
        res.redirect("/")
    })

})

module.exports = router;