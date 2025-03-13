// Libraries
const express = require("express");
const router = express.Router();
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

// Routes
// Get a bus image
router.get("/get", async (req, res) => {  
    // make sure a bus name is passed
    // NOC can be null because the API sometimes returns that
    const noc = req.query.noc;
    const busName = req.query.routeName;

    if (!busName) {
        return res.status(400).json({ error: "Bus name is required" });
    }
    
    // create canvas
    const canvas = createCanvas(150, 120);
    const ctx = canvas.getContext("2d");
    
    // set white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 150, 120);
    
    try {
        let logoUrl;
        
        // determine which logo to use based on NOC code
        if (noc.toLowerCase().startsWith("s")) {
            // stagecoach
            logoUrl = "https://i.ibb.co/YZVqQvy/stagecoach.png";
        } else if (noc.toLowerCase().startsWith("f")) {
            // first bus
            logoUrl = "https://i.ibb.co/F8HvCZD/firstbus.png";
        } else if (noc.toLowerCase() === "embr") {
            // ember
            logoUrl = "https://i.ibb.co/GCXHx7h/ember.png";
        } else {
            // generic logo
            logoUrl = "https://i.ibb.co/kG3vbKC/generic.png";
        }
        
        // load and draw the logo       
        const logo = await loadImage(logoUrl).catch(error => {
            console.error("Failed to load image:", error);
            throw new Error("Failed to load image from i.ibb");
        });

        // calculate dimensions to fit logo in the top portion of canvas
        const logoWidth = 50;
        const logoHeight = 50;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = 20;
        
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        
        // add bus name below the logo in black text
        ctx.fillStyle = "#000000";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText(busName, canvas.width / 2, 95);
        
        // Send image as response
        res.setHeader("Content-Type", "image/png");
        canvas.createPNGStream().pipe(res);
    } catch (error) {
        console.error("Error generating bus image:", error);
        res.status(500).json({ error: "Failed to generate bus image" });
    }
});

module.exports = router;