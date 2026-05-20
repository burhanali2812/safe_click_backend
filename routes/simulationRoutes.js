const express = require("express");
const authMiddleWare = require("../MiddleWare/authMiddleware");
const User = require("../models/user");
const SimulationResult = require("../models/simulationResult");
const axios = require("axios");

const router = express.Router();
router.get("/verify-account", async (req, res) => {
  try {
    const { email, campaignId } = req.query;

    if (!email || !campaignId) {
      return res.status(400).send("Missing required fields");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "Unknown";

    const deviceInfo = req.headers["user-agent"] || "Unknown Device";
    const operatingSystem = req.headers["sec-ch-ua-platform"] || "Unknown OS";
        await SimulationResult.create({
          userId: user._id,
          campaignId,
          linkClicked: true,
          ipAddress,
          deviceInfo,
          operatingSystem,
          location,
          interactionTime: new Date(),
        });
        
   
    res.redirect("https://safe-clicks1.vercel.app/phishing-trap");

  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
});

router.get("/track-open", async (req, res) => {
  try {

    const { email, campaignId } = req.query;

    if (!email || !campaignId) {
      return res.end();
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.end();
    }

    // prevent duplicates
    const existingResult =
      await SimulationResult.findOne({
        userId: user._id,
        campaignId
      });

    if (existingResult) {

      existingResult.emailOpened = true;
      existingResult.openedAt = new Date();

      await existingResult.save();

    } else {

      await SimulationResult.create({
        userId: user._id,
        campaignId,
        emailOpened: true,
        openedAt: new Date()
      });
    }

    // invisible 1x1 transparent gif
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "base64"
    );

    res.setHeader("Content-Type", "image/gif");

    return res.send(pixel);

  } catch (error) {

    console.error(error);

    return res.end();
  }
});




module.exports = router;