// server.js
// load the things we need
var express = require('express');
var app = express();
app.use(express.static("public"));

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file
// index page 
app.get('/', function(req, res) {
    // Pass any query parameters to the view
    const busRoute = req.query.bus || null;
    res.render('pages/index', {
        busRoute: busRoute
    });
});

// Handle direct bus route URLs
app.get('/bus/:route', function(req, res) {
    const busRoute = req.params.route;
    res.redirect(`/?bus=${busRoute}`);
});

app.listen(8080);
console.log('8080 is the magic port');