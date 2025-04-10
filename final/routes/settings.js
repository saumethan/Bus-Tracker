// settings.js

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
    try {
        //First we check if a user is logged in 
        if (req.session.loggedin === true) {
            console.log("Logged in:", req.session.loggedin);
        //we then find the user that they are logged in as
            userData = await db.collection('users').findOne({
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
router.post('/logout', async function(req, res) {
    try{
        if(req.session.loggedin === true){
            console.log("Logged out:", req.session.loggedin);
            req.session.loggedin = false;
            req.session.thisuser = null;
            res.redirect('/');
    }else{
            console.log("Not logged in, cannot log out");
            res.redirect('/settings');
    }
}catch (error) {
        console.error("Error during logout:", error);
    }
});


//-=-=-=-=-=-=-=-=-=-=-=-=-===-=-Change Password =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\\
router.post('/changepassword', async function(req, res) {
    //Gets the 3 password from the form 
    const oldpassword = req.body.oldpassword;
    const newpassword = req.body.newpassword;
    const confirmpassword = req.body.confirmpassword;
    
    
    
    try{
        
        if(req.session.loggedin === true){
            const username = req.session.thisuser;

            //find the user in the database
            const user = await db.collection('users').findOne({
                "login.username": username
            });
            if(!user){
                console.log("User not found:", username);
                return res.redirect('/settings');
            }
            const currentpassword = user.login.password;
            console.log("Current password:", currentpassword);
            console.log("Old password:", oldpassword);


            if(oldpassword === currentpassword && newpassword===confirmpassword ){
                //update the password of the user
                const result = await db.collection('users').updateOne(
                    { "login.username": username },
                    { $set: { "login.password": newpassword } },
                    
                );
                console.log("Password updated for user:", username)
                res.redirect('/');
            //Check if passwords match
            }else if(oldpassword !== currentpassword){
                console.log("Old password does not match current password");
                res.redirect('/settings');
            }else if(confirmpassword !== newpassword){
                console.log("Passwords do not match!!");
                res.redirect('/settings');
            }else{
                console.log("UNEXPECTED ERROR");
                res.redirect('/settings');
            }
    }else{
            console.log("Not logged in, cannot change password");
            res.redirect('/settings');
    }
}catch (error) {
        console.error("Error during change of password:", error);
        res.redirect('/settings');
    }
});
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=Delete Account-=-=-=-=-=-=-=-=-=-===-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\\
router.post('/deleteaccount', async function(req, res) {
    const deleteaccount = req.body.deletetext;
    
    try{
        if(req.session.loggedin === true){
            //we need to delete the user from the database
            const username = req.session.thisuser;
            //Only if the user has typed delete will it then delete the account from the database
            if(deleteaccount === "delete"){    
            const result = await db.collection('users').deleteOne({"login.username": username});
            console.log("Deleted user:", username);
            req.session.loggedin = false;
            router.post('/logout');
            res.redirect('/');
            }else{
                console.log("User did not type delete, account not deleted");
                res.redirect('/settings');
            }
    }else{
            console.log("Not logged in, cannot delete account");
            res.redirect('/settings');
    }
}catch (error) {
        console.error("Error during account deletion:", error);
    }
});


module.exports = router;



//Josh TO DO LIST 
/*
change password 
add a method to sign out via the login/sign out bit
sign out / login change 


*/