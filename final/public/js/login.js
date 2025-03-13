const MongoClient = require('mongodb-legacy').MongoClient;
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = "login_Details";

const express = require('express')
const app = express()



app.use(session({secret : 'example'}))
app.use(express.static('public'))


var db

connectDB();
async function connectDB(){
    await client.connect()
    console.log("Connected to the server");
    db = client.db(dbName)
    app.listen(8080)
    console.log("Listening for connections on port 8080")
}


//What i need to do??
//Account creation

app.use(express.urlencoded({extended:true}))

    app.post('/createAccount', function(req, res){
        db.collection('login_Details').insertOne(req.body, function(err, result){
            if(err) throw err
            console.log("Account Created")
            res.redirect('/')


        })
    })




//Login validation
//User Management
