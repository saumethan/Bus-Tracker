// Libraries
const express = require("express");
const router = express.Router();
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

// Functions
// Draw direction triangle based on bearing
function drawDirectionIndicator(ctx, bearing, centerX, centerY, radius) {
    // Convert bearing to radians (bearing is clockwise from north)
    const radians = (bearing - 90) * Math.PI / 180;
    
    // Calculate the tip of the triangle at the edge of the radius
    const pointX = centerX + radius * Math.cos(radians);
    const pointY = centerY + radius * Math.sin(radians);
    
    // Calculate the two other points of the equilateral triangle
    // The angles for the two base points are 120 degrees apart from the tip angle
    const baseAngle1 = radians + Math.PI * 2 / 3;  // 120 degrees clockwise
    const baseAngle2 = radians - Math.PI * 2 / 3;  // 120 degrees counterclockwise
    
    // Set the same distance (e.g., 15px) for the base of the triangle
    const baseLength = 15;

    // Calculate the two base points using the base angle and baseLength
    const base1X = centerX + baseLength * Math.cos(baseAngle1);
    const base1Y = centerY + baseLength * Math.sin(baseAngle1);
    const base2X = centerX + baseLength * Math.cos(baseAngle2);
    const base2Y = centerY + baseLength * Math.sin(baseAngle2);
    
    // Draw the equilateral triangle
    ctx.beginPath();
    ctx.moveTo(pointX, pointY); // tip of the triangle
    ctx.lineTo(base1X, base1Y); // first base point
    ctx.lineTo(base2X, base2Y); // second base point
    ctx.closePath();
    
    // Set triangle style
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)"; // Semi-transparent red
    ctx.fill();
    ctx.strokeStyle = "#ff0000";  // Outline color
    ctx.lineWidth = 1.5;  // Stroke width
    ctx.stroke();
}


// Routes
// Get a bus image
router.get("/get", async (req, res) => {  
    // make sure a bus name is passed
    // NOC can be null because the API sometimes returns that
    const noc = req.query.noc || "";
    const busName = req.query.routeName;
    const bearing = 140; //req.query.bearing ? parseFloat(req.query.bearing) : 0;

    if (!busName) {
        return res.status(400).json({ error: "Bus name is required" });
    }
    
    // create canvas
    const canvas = createCanvas(80, 80);
    const ctx = canvas.getContext("2d");
    
    // set white background
    //ctx.fillStyle = "#ffffff";
    //ctx.fillRect(0, 0, 100, 100);
    
    try {
        // load the indicator image
        const indicator = await loadImage("https://i.ibb.co/WvfpbW23/indicator.png");
        const bearingRad = bearing * Math.PI / 180;
        const logoX = (canvas.width - logoWidth) / 2;
        ctx.rotate(bearingRad);

        ctx.drawImage(indicator, logoX, 50, 50, 50);


        let logoUrl;
        
        // determine which logo to use based on NOC code
        if (noc.toLowerCase().startsWith("s")) {
            // stagecoach
            logoUrl = "https://i.ibb.co/XZCZYykk/stagecoach.png";
        } else if (noc.toLowerCase().startsWith("f")) {
            // first bus
            logoUrl = "https://i.ibb.co/3L8y49z/first-bus.png";
        } else if (noc.toLowerCase() === "embr") {
            // ember
            logoUrl = "https://i.ibb.co/d08My2kN/ember.png";
        } else {
            // generic logo
            logoUrl = "https://i.ibb.co/JjHbjbFx/bus.png";
        }
        
        // load and draw the logo       
        const logo = await loadImage(logoUrl).catch(error => {
            console.error("Failed to load image:", error);
            throw new Error("Failed to load image from i.ibb");
        });

        // calculate dimensions to fit logo in the top portion of canvas
        const logoWidth = 50;
        const logoHeight = 50;
        const logoY = 20;
        
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        
        // add bus name below the logo in black text
        ctx.fillStyle = "#000000";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText(busName, canvas.width / 2, 93);

        // send image as response
        res.setHeader("Content-Type", "image/png");
        canvas.createPNGStream().pipe(res);
    } catch (error) {
        console.error("Error generating bus image:", error);
        res.status(500).json({ error: "Failed to generate bus image" });
    }
});

module.exports = router;