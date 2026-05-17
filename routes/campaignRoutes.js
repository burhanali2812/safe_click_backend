const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Admin = require("../models/admin");
const Template = require("../models/emailTemplate");
const Campaign = require("../models/compaign");
const authMiddleWare = require("../MiddleWare/authMiddleware");

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post("/create-campaign", authMiddleWare, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const { name, description, emailTemplateId, targetedUsers } = req.body;
        if (!name || !emailTemplateId || !Array.isArray(targetedUsers) || targetedUsers.length === 0) {
            return res.status(400).json({ success: false, message: "Name, email template, and targeted users are required" });
        }
        const newCampaign = new Campaign({
            title: name,
            description,
            emailTemplateId,
            targetUsers: targetedUsers,
        });
        await newCampaign.save();
        // send emails to targeted users using the email template (this can be done asynchronously in a real application)
        const template = await Template.findById(emailTemplateId);
        for (const userId of targetedUsers) {
            const user = await User.findById(userId);
            if (user) {
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: user.email,
                    subject: template.subject,
                    html: template.body
                });
            }
        }
        res.status(201).json({ success: true, message: "Campaign created successfully", data: newCampaign });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

router.get("/campaigns", authMiddleWare, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const campaigns = await Campaign.find().populate("emailTemplateId", "templateName");
        res.status(200).json({ success: true, data: campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

router.get("/campaigns/:id", authMiddleWare, async (req, res) => {  
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const campaign = await Campaign.findById(req.params.id).populate("emailTemplateId", "templateName subject body");
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }
        res.status(200).json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

router.delete("/campaigns/:id", authMiddleWare, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }
        res.status(200).json({ success: true, message: "Campaign deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

module.exports = router;