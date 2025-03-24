// Libraries
const express = require("express");
const router = express.Router();
const { createCanvas, loadImage } = require("canvas");

// Routes
// Get a bus image
router.get("/get", async (req, res) => {  
    // make sure a bus name is passed
    // NOC can be null because the API sometimes returns that
    const noc = req.query.noc || "";
    const busName = req.query.routeName || "N/A";
    const bearing = req.query.bearing ? parseFloat(req.query.bearing) : 0;

    if (!busName) {
        return res.status(400).json({ error: "Bus name is required" });
    }
    
    // create canvas
    const canvas = createCanvas(80, 120);
    const ctx = canvas.getContext("2d");
    
    // set white background
    //ctx.fillStyle = "#ffffff";
    //ctx.fillRect(0, 0, 100, 100);
    
    try {
        // determine which logo to use based on NOC code
        let logoUrl;
        let indicatorImage;
        if (noc.toLowerCase().startsWith("s")) {
            // stagecoach
            logoUrl = "https://i.ibb.co/XZCZYykk/stagecoach.png";
            indicatorImage = "https://i.ibb.co/V0Ss20LL/indicator-stagecoach.png";
        } else if (noc.toLowerCase().startsWith("f")) {
            // first bus
            logoUrl = "https://i.ibb.co/4RB57BHV/first-bus.png";
            indicatorImage = "https://i.ibb.co/3P3qYM5/indicator-first.png";
        } else if (noc.toLowerCase() === "embr") {
            // ember
            logoUrl = "https://i.ibb.co/d08My2kN/ember.png";
            indicatorImage = "https://i.ibb.co/RpBX5Cb1/indicator-ember.png";
        } else if (noc.toLowerCase() === "trdu") {
            // xplore dundee
            logoUrl = "https://i.ibb.co/S7f4f7pZ/xplore-dundee.png";
            indicatorImage = "https://i.ibb.co/jPBpFBXJ/indicator.png"
        } else if (noc.toLowerCase() === "mcgl" || noc.toLowerCase() === "brbu") {
            // mcgills
            logoUrl = "https://i.ibb.co/93VrBSmL/mcgills.png";
            indicatorImage = "https://i.ibb.co/jPBpFBXJ/indicator.png"
        } else if (noc.toLowerCase() === "loth" || noc.toLowerCase() === "etor" || noc.toLowerCase() === "ecbu" || noc.toLowerCase() === "nelb") {
            // lothian buses
            logoUrl = "https://i.ibb.co/JjTBHpQS/lothian-buses.png";
            indicatorImage = "https://i.ibb.co/jPBpFBXJ/indicator.png"
        } else if (noc.toLowerCase() === "mblb") {
            // midland bluebird
            logoUrl = "https://i.ibb.co/hR80Hmzh/midlands-bluebird.png";
            indicatorImage = "https://i.ibb.co/jPBpFBXJ/indicator.png"
        } else {
            // generic logo
            logoUrl = "https://i.ibb.co/Q31hvPSL/bus.png";
            indicatorImage = "https://i.ibb.co/jPBpFBXJ/indicator.png";
        }
        
        // load the logo and indicator images
        const indicator = await loadImage(indicatorImage);
        const logo = await loadImage(logoUrl);

        // draw the indicator centered and rotated towards the bearing
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(bearing * Math.PI / 180); // rotate in radians towards bearing
        ctx.drawImage(indicator, -40, -40, 80, 80);
        ctx.restore(); // restore previous state to draw logo without rotation
        
        // draw the logo in center of image
        const logoWidth = 45;
        const logoHeight = 45;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = (canvas.height - logoHeight) / 2;

        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        
        // add bus name below the logo in black text
        ctx.fillStyle = "#000000";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(busName, canvas.width / 2, 115);

        // create image buffer and send the buffer instead of piping stream
        const buffer = canvas.toBuffer("image/png");
        res.setHeader("Content-Type", "image/png");
        res.send(buffer);
    } catch (error) {
        console.error("Error generating bus image:", error);
        res.status(500).json({ error: "Failed to generate bus image" });
    }
});

module.exports = router;