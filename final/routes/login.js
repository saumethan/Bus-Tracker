const express = require("express");
const router = express.Router();

// MongoDB connection
const MongoClient = require("mongodb-legacy").MongoClient;
const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);
const dbName = "User_Profiles";
let db;

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

router.post('/userlogin', async function(req, res) {
    var userName = req.body.uname;
    var userPass = req.body.upass;

    try {
        var result = await db.collection('users').findOne({
            "login.username": userName
        });

        if (!result) {
            console.log("No User Found");
            return res.status(401).send("No User with that name found");
        }

        if (result.login.password === userPass) {
            req.session.loggedin = true;
            req.session.thisuser = userName;
            console.log("Logged in:", req.session.loggedin);
            res.redirect('/');
        } else {
            console.log("Incorrect Password");
            res.status(401).send("Incorrect Password, please try again");
        }
    } catch (error) {
        console.error("Login Error", error);
        res.status(500).send("Failed to log in at this time");
    }
});

module.exports = router;
