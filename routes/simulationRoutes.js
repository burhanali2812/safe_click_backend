const express = require("express");
const authMiddleWare = require("../MiddleWare/authMiddleware");
const User = require("../models/user");
const SimulationResult = require("../models/simulationResult");
const axios = require("axios");

const router = express.Router();
router.get("/verify-account", async (req, res) => {
  try {
    const { simulationResultId } = req.query;

    if (!simulationResultId) {
      return res.status(400).send("Missing simulationResultId");
    }

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "Unknown";

    const deviceInfo = req.headers["user-agent"] || "Unknown Device";
    const operatingSystem = req.headers["sec-ch-ua-platform"] || "Unknown OS";

    const browser = req.headers["sec-ch-ua"] || "Unknown Browser";

    const deviceType = /mobile/i.test(deviceInfo)
      ? "Mobile"
      : /tablet/i.test(deviceInfo)
        ? "Tablet"
        : "Desktop";

    const result = await SimulationResult.findById(simulationResultId);

    if (result) {
      result.linkClicked = true;
      result.clickedAt = new Date();
      result.ipAddress = ipAddress;
      result.deviceInfo = deviceInfo;
      result.operatingSystem = operatingSystem;
      result.browser = browser;
      result.deviceType = deviceType;

      await result.save();
    }

 res.redirect(
  `https://safe-clicks1.vercel.app/phishing-trap?simulationResultId=${simulationResultId}`
);

  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
});

router.put("/setLocation", async (req, res) => {
  try {
    const { simulationResultId, location } = req.body;

    if (!simulationResultId || !location) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const updated = await SimulationResult.findByIdAndUpdate(
      simulationResultId,
      { location },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location updated"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.get("/track-open", async (req, res) => {
  try {
    const { simulationResultId } = req.query;

    if (!simulationResultId) return res.end();

    const result = await SimulationResult.findById(simulationResultId);

    if (result) {
      result.emailOpened = true;
      result.emailOpenedAt = new Date();
      result.interactionTime ||= new Date();

      await result.save();
    }

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
