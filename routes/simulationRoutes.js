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
      req.socket.remoteAddress ||
      "Unknown";

    const deviceInfo =
      req.headers["user-agent"] || "Unknown Device";

    const operatingSystem =
      req.headers["sec-ch-ua-platform"] || "Unknown OS";

 
    let location = "Unknown";

    try {
      const response = await axios.get(
        `https://api.ipinfo.io/lite/${ipAddress}?token=${process.env.IPINFO_TOKEN}`
      );

      const data = response.data;

      location = `${data.city || "Unknown City"}, ${
        data.country || "Unknown Country"
      }`;
    } catch (ipError) {
      console.error(
        "IPInfo lookup failed:",
        ipError.message
      );
    }


    const existingResult =
      await SimulationResult.findOne({
        userId: user._id,
        campaignId,
      });

    if (!existingResult) {
   
      await SimulationResult.create({
        userId: user._id,

        campaignId,

        emailOpened: true,

        linkClicked: true,

        ipAddress,

        interactionTime: new Date(),

        deviceInfo,

        operatingSystem,

        location,
      });
    }

    return res.redirect(
      "https://safe-clicks1.vercel.app/phishing-trap"
    );
  } catch (error) {
    console.error(error);

    return res.status(500).send("Server error");
  }
});




module.exports = router;