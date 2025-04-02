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
        console.log("Connected to the database");
    } catch (error) {
        console.error("Database connection failed", error);
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
        // Check if user is already logged in
        //if (req.session.loggedin === true) {
         //  res.redirect('/login');
         //  return;
        //}

        // Store user data from the form
        const datatostore = {
            "name": { "title": req.body.title, "first": req.body.first },
            "login": { "username": req.body.email, "password": req.body.password },
            "registered": new Date()
        };

        // Insert the new user into the database
        const result = await db.collection('users').insertOne(datatostore);
        console.log("Saved to database:", result.insertedId);
        res.session.loggedin = true;
        req.session.thisuser = userName

        console.log("Logged new user into their account ")

        res.redirect('/');

    } catch (error) {
        console.error("Error saving to database:", error);
        res.status(500).send("Failed to create account");
    }
});

//-=-=-=-=-=-=-=-=-==-=-=-=-=Login Pathways -=-=-=-=-=-=-=-=-=-=-===-=-=-==-=-=-=-=-=-=-=-=-=-=-\\
router.post('/login/userlogin', async function(req,res){
    var userName = req.body.uname;
    var userPass = req.body.upass;

    //Gets the users name from the form when submitted then trys to find it in the database
    try{
        var result = await db.collection('users').findOne({
            "login.username": userName
        })
    //If the users username is incorect and dosent match the database then this will return a message saying that a user with this name has not been found
        if(!result){
            console.log("No User Found")
            return res.status(401).send("No User with that name found")
            return
        }
    //Checks the entered password with the users name to check that they match correctly
        if(result.login.password=== userPass){
            res.session.loggedin = true;
            req.session.thisuser = userName
            console.log("Logged in : " +req.session.loggedin)
            res.redirect('/')
        }
    //If the password is incorrect / dosent match the user then it will return a message saying incorect password
        else{
            console.log("Incorrect Password")
            res.status(401).send("Incorrect Password please try again")
        }
    }catch(error){
        console.error("Login Error", error)
        res.status(500).send("Failed to log in at this time")
    }
})



//-=-=-=-=-=-=-=-=-=-=-=-=-===-=-Change Username =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\

//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Delete Account-=-=-=-=-=-=-=-=-=-===-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\\

//-=-=-=-=-=-==-=-=-=-=-=-=-=-=-logout button controls -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\

module.exports = router;