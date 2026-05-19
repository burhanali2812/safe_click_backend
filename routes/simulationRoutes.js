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

    // 🚀 respond immediately
    res.redirect("https://safe-clicks1.vercel.app/phishing-trap");

    // 🔥 run tracking AFTER response
    setImmediate(async () => {
      try {
        let location = "Unknown";

        try {
          const response = await axios.get(
            `https://api.ipinfo.io/lite/${ipAddress}?token=${process.env.IPINFO_TOKEN}`,
            { timeout: 3000 }
          );

          const data = response.data;

          location = `${data.city || "Unknown"}, ${data.country || "Unknown"}`;
        } catch (err) {
          console.log("IP lookup failed:", err.message);
        }

        await SimulationResult.create({
          userId: user._id,
          campaignId,
          emailOpened: true,
          linkClicked: true,
          ipAddress,
          deviceInfo,
          operatingSystem,
          location,
          interactionTime: new Date(),
        });

      } catch (e) {
        console.error("Tracking error:", e.message);
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
});




module.exports = router;