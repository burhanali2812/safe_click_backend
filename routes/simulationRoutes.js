const express = require("express");
const authMiddleWare = require("../MiddleWare/authMiddleware");
const User = require("../models/user");
const SimulationResult = require("../models/simulationResult");

const router = express.Router();

router.get("/verify-account", async (req, res) => {
    const { email, campaignId } = req.query;

    if (!email || !campaignId) {
        return res.status(400).send("Missing required fields");
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).send("User not found");

        const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress;

        const deviceInfo = req.headers["user-agent"] || "Unknown";

        const operationSystem =
            req.headers["sec-ch-ua-platform"] || "Unknown OS";

        await SimulationResult.create({
            userId: user._id,
            campaignId,
            emailOpened: true,
            linkClicked: true,
            ipAddress: ip,
            interactionTime: new Date(),
            deviceInfo,
            operatingSystem: operationSystem,
            location: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress
        });

        return res.redirect(
            "https://safe-clicks1.vercel.app//phishing-trap"
        );

    } catch (error) {
        return res.status(500).send("Server error");
    }
});




module.exports = router;