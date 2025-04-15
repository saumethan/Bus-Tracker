/**
 * @author Ethan Saum @saumethan
 * @author Joshua Newton
 * @description settings.js
 */

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
        console.log("Settings page Connected to the database");
    } catch (error) {
        console.error("settings page Database connection failed", error);
    }
}
connectDB();

// SERVER ENDPOINT: create page
router.get("/", async function(req, res) {
    let userData = null;

    // Check if the user is logged in
    if (req.session.loggedin !== true) {
        // User is not logged in, redirect to login page
        return res.status(200).redirect("/login");
    }

    try {
        //First we check if a user is logged in 
        if (req.session.loggedin === true) {
            console.log("Logged in:", req.session.loggedin);
        //we then find the user that they are logged in as
            userData = await db.collection("users").findOne({
                "login.username": req.session.thisuser
            });
        //prints the username of the user who is logged else it will print not logged in 
            if (userData) {
                console.log("User found:", userData.login.username);
            }
        } else {
            console.log("Not logged in");
        }
        //error hissy fit
    } catch (error) {
        console.error("Error fetching user:", error);
    }
    //renders the page settings and also passes the user data to the page of settings so that it can put the details in log out button area or say not logged in
    res.render("pages/settings", {
        page: "settings",
        user: userData,
        loggedIn: req.session.loggedin === true
    });
});


//-=-=-=-=-=-==-=-=-=-=-=-=-=-=-logout button controls -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
router.post("/logout", async function(req, res) {
    try{
        if(req.session.loggedin === true){
            console.log("Logged out:", req.session.loggedin);
            req.session.loggedin = false;
            req.session.thisuser = null;
            res.redirect("/");
    }else{
            console.log("Not logged in, cannot log out");
            res.redirect("/settings");
    }
}catch (error) {
        console.error("Error during logout:", error);
    }
});

router.get("/logout", (req, res) => {
    // Destroy the session on the server
    // https://stackoverflow.com/questions/22349645/how-to-delete-express-session-cookie
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.redirect("/"); 
        }
        res.clearCookie("connect.sid", { path: "/" }); 
        res.redirect("/"); 
    });
});


//-=-=-=-=-=-=-=-=-=-=-=-=-===-=-Change Password =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
router.post("/changepassword", async function(req, res) {
    //Gets the 3 password from the form 
    const oldpassword = req.body.oldpassword;
    const newpassword = req.body.newpassword;
    const confirmpassword = req.body.confirmpassword;
    
    try{
        
        if(req.session.loggedin === true){
            const username = req.session.thisuser;

            //find the user in the database
            const user = await db.collection("users").findOne({
                "login.username": username
            });
            if(!user){
                console.log("User not found:", username);
                return res.redirect("/settings");
            }
            const currentpassword = user.login.password;
            console.log("Current password:", currentpassword);
            console.log("Old password:", oldpassword);


            if(oldpassword === currentpassword && newpassword===confirmpassword ){
                //update the password of the user
                const result = await db.collection("users").updateOne(
                    { "login.username": username },
                    { $set: { "login.password": newpassword } },
                    
                );
                console.log("Password updated for user:", username)
                res.redirect("/");
            //Check if passwords match
            }else if(oldpassword !== currentpassword){
                console.log("Old password does not match current password");
                res.redirect("/settings");
            }else if(confirmpassword !== newpassword){
                console.log("Passwords do not match!!");
                res.redirect("/settings");
            }else{
                console.log("UNEXPECTED ERROR");
                res.redirect("/settings");
            }
    }else{
            console.log("Not logged in, cannot change password");
            res.redirect("/settings");
    }
}catch (error) {
        console.error("Error during change of password:", error);
        res.redirect("/settings");
    }
});

//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Delete Account-=-=-=-=-=-=-=-=-=-===-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\\
router.post("/deleteaccount", async function(req, res) {
    const deleteaccount = req.body.deletetext;
    try{
        if(req.session.loggedin === true){
            //we need to delete the user from the database
            const username = req.session.thisuser;
            //Only if the user has typed delete will it then delete the account from the database
            if(deleteaccount === "delete"){    
            const result = await db.collection("users").deleteOne({"login.username": username});
            console.log("Deleted user:", username);
            req.session.loggedin = false;
            router.post("/logout");
            res.redirect("/");
            }else{
                console.log("User did not type delete, account not deleted");
                res.redirect("/settings");
            }
    }else{
            console.log("Not logged in, cannot delete account");
            res.redirect("/settings");
    }
}catch (error) {
        console.error("Error during account deletion:", error);
    }
});

// ------------------ Route to set user settings ------------------
router.post("/userSettings", async function(req, res) {
    if (!req.session || !req.session.loggedin) {
        return res.status(401).send("Unauthorized: Please log in first.");
    }

    const newZoom = parseInt(req.body.newZoom, 10);
    const username = req.session.thisuser;

    if (isNaN(newZoom) || newZoom < 1 || newZoom > 30) {
        return res.status(400).send("Invalid zoom level.");
    }

    try {
        result = await db.collection("users").updateOne(
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
            loggedIn: false
        });
    }
});

// ------------------ Route to get user settings ------------------
router.get("/userSettings", async function(req, res) {
    if (!req.session || !req.session.loggedin) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const username = req.session.thisuser;

    try {
        const user = await db.collection("users").findOne({ "login.username": username });

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

// ------------------ Route to set user units settings ------------------

router.post("/userUnitsSettings", async function(req, res) {
    if (!req.session || !req.session.loggedin) {
        return res.status(401).send("Unauthorized: Please log in first.");
    }

    const isKM = req.body.isKM;
    const username = req.session.thisuser;

    
    try {
        const result = await db.collection("users").updateOne(
            { "login.username": username },
            { $set: { isKM: isKM } }
        );

        if (result.modifiedCount === 1) {
            console.log(`units updated to ${isKM} for ${username}`);
            res.status(200).send("units updated.");
        } else {
            res.status(404).send("User not found.");
        }
    } catch (error) {
        console.error("Login Error", error);
        res.render("pages/login", {
            page: "login",
            loggedIn: false
        });
    }
});

// ------------------ Route to get user units settings ------------------
router.get("/userUnitsSettings", async function(req, res) {
    if (!req.session || !req.session.loggedin) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const username = req.session.thisuser;

    try {
        const user = await db.collection("users").findOne({ "login.username": username });

        if (user && user.isKM !== undefined) {
            res.status(200).json({ isKM: user.isKM });
        } else {
            res.status(404).json({ error: "Units not found" });
        }
    } catch (error) {
        console.error("Error retrieving Units:", error);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;



//Josh TO DO LIST 
/*
How messages are show e.g "passwords do not match"


*/