const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Quiz = require("../models/quiz");
const QuizResult = require("../models/quizResult");
const Campaign = require("../models/compaign");
const SimulationResult = require("../models/simulationResult");
const Admin = require("../models/admin");
const authMiddleWare = require("../MiddleWare/authMiddleware");


const router = express.Router();

const formatSimulationResult = (row) => {
    const user = row.userId && typeof row.userId === "object" ? row.userId : null;

    return {
        id: row._id,
        userId: user?._id?.toString?.() || row.userId?.toString?.() || "-",
        userName: user?.name || "Unknown User",
        userEmail: user?.email || "-",
        emailOpened: Boolean(row.emailOpened),
        emailOpenedAt: row.emailOpenedAt || null,
        linkClicked: Boolean(row.linkClicked),
        clickedAt: row.clickedAt || null,
        interactionTime: row.interactionTime || row.createdAt || null,
        ipAddress: row.ipAddress || "-",
        deviceInfo: row.deviceInfo || "-",
        operatingSystem: row.operatingSystem || "-",
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null,
    };
};

// Admin registration
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body; 
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required" });
        }
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: "Email already in use" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ name, email, password: hashedPassword });
        await newAdmin.save();
        res.status(201).json({ success: true, message: "Admin registered successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// Admin login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }
        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(200).json({ success: true, message: "Admin logged in successfully", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

router.get("/campaign-results/:campaignId", authMiddleWare, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const { campaignId } = req.params;

        const campaign = await Campaign.findById(campaignId)
            .populate("emailTemplateId", "templateName subject")
            .lean();

        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        const targetUserIds = Array.isArray(campaign.targetUsers) ? campaign.targetUsers : [];

        const users = await User.find({ _id: { $in: targetUserIds } })
            .select("name email role accountStatus riskLevel securityScore")
            .lean();

        const userMap = new Map(users.map((user) => [String(user._id), user]));

        const simulationResults = await SimulationResult.find({ campaignId })
            .sort({ createdAt: -1 })
            .populate("userId", "name email")
            .lean();

        const latestByUser = new Map();

        for (const result of simulationResults) {
            const userId = String(
                result.userId?._id || result.userId || result.userId?.toString?.(),
            );

            if (!latestByUser.has(userId)) {
                latestByUser.set(userId, formatSimulationResult(result));
            }
        }

        const results = targetUserIds.map((targetUserId) => {
            const user = userMap.get(String(targetUserId));
            const latestResult = latestByUser.get(String(targetUserId));

            return {
                id: latestResult?.id || String(targetUserId),
                userId: String(targetUserId),
                userName: user?.name || latestResult?.userName || "Unknown User",
                userEmail: user?.email || latestResult?.userEmail || "-",
                emailOpened: latestResult?.emailOpened || false,
                emailOpenedAt: latestResult?.emailOpenedAt || null,
                linkClicked: latestResult?.linkClicked || false,
                clickedAt: latestResult?.clickedAt || null,
                interactionTime: latestResult?.interactionTime || null,
                ipAddress: latestResult?.ipAddress || "-",
                deviceInfo: latestResult?.deviceInfo || "-",
                operatingSystem: latestResult?.operatingSystem || "-",
            };
        });

        const totalTargetUsers = results.length;
        const totalEmailOpened = results.filter((row) => row.emailOpened).length;
        const totalLinkClicked = results.filter((row) => row.linkClicked).length;
        const pendingUsers = results.filter((row) => !row.emailOpened && !row.linkClicked).length;
        const engagedUsers = results.filter((row) => row.emailOpened || row.linkClicked).length;

        const openRate = totalTargetUsers
            ? Number(((totalEmailOpened / totalTargetUsers) * 100).toFixed(1))
            : 0;

        const clickRate = totalTargetUsers
            ? Number(((totalLinkClicked / totalTargetUsers) * 100).toFixed(1))
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                campaign,
                summary: {
                    totalTargetUsers,
                    totalEmailOpened,
                    totalLinkClicked,
                    pendingUsers,
                    engagedUsers,
                    openRate,
                    clickRate,
                },
                results,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
});

module.exports = router;