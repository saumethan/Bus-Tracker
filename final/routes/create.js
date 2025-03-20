// create.js

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

// SERVER ENDPOINT: create page
router.get("/", function(req, res) {
    res.render("pages/create");
});


//Create User Account
    router.post('/createUser', function(req,res){
        //Checks that a user isnt already logged in instead of creating a new account
        if(!req.session.loggedin){res.redirect('/login');return}

    })

var datatostore={
    "name":{"title":req.body.title, "first":req.body.first},
    "login":{"username":req.body.email, "password": req.body.password},
    "registered": Date()
}

db.collection('users').insertOne(datatostore, function(err, result){
    if(err) throw err
    console.log("Saved to database")
    res.redirect('/')
})


module.exports = router;