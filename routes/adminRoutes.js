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

const roundNumber = (value) => Number(Number(value || 0).toFixed(1));

const formatSimulationResult = (row) => {
  const user = row.userId && typeof row.userId === "object" ? row.userId : null;
  const location = row.location || {};
  const coordinates = location.coordinates || {};

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
    deviceType: row.deviceType || "Unknown",
    browser: row.browser || "-",
    location: {
      country: location.country || "-",
      region: location.region || "-",
      area: location.area || "-",
      coordinates: {
        lat: coordinates.lat ?? null,
        lon: coordinates.lon ?? null,
      },
    },
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
};

// Admin registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ name, email, password: hashedPassword });
    await newAdmin.save();
    res
      .status(201)
      .json({ success: true, message: "Admin registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 🔵 CHECK ADMIN FIRST
    const admin = await Admin.findOne({ email });

    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign(
        { id: admin._id, email: admin.email, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Admin logged in successfully",
        token,
        role: "admin",
      });
    }

    // 🟢 CHECK USER
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.accountStatus === "pending") {
      return res.status(403).json({
        success: false,
        message: "Account does not exist!",
      });
    }

    if (
      user.accountStatus === "blocked" ||
      user.accountStatus === "suspended"
    ) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}`,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
      role: "user",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/summary", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const [userSummary, totalEmailTemplates, activeEmailTemplates, totalCampaignRuns, totalQuizzes, totalQuizAttempts, uniqueQuizSolvers, recentUsers, recentCampaigns, recentQuizzes, recentTemplates, recentQuizAttempts] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ["$accountStatus", "active"] }, 1, 0] },
            },
            pendingUsers: {
              $sum: { $cond: [{ $eq: ["$accountStatus", "pending"] }, 1, 0] },
            },
            suspendedUsers: {
              $sum: { $cond: [{ $eq: ["$accountStatus", "suspended"] }, 1, 0] },
            },
            blockedUsers: {
              $sum: { $cond: [{ $eq: ["$accountStatus", "blocked"] }, 1, 0] },
            },
            lowRiskUsers: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "low"] }, 1, 0] },
            },
            mediumRiskUsers: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "medium"] }, 1, 0] },
            },
            highRiskUsers: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] },
            },
            averageSecurityScore: {
              $avg: { $ifNull: ["$securityScore", 0] },
            },
          },
        },
      ]),
      Template.countDocuments(),
      Template.countDocuments({ isActive: true }),
      Campaign.countDocuments(),
      Quiz.countDocuments(),
      QuizResult.countDocuments(),
      QuizResult.distinct("userId"),
      User.find()
        .select("name email role accountStatus riskLevel securityScore createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Campaign.find()
        .populate("emailTemplateId", "templateName")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Quiz.find().sort({ createdAt: -1 }).limit(6).lean(),
      Template.find().sort({ createdAt: -1 }).limit(6).lean(),
      QuizResult.find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(8)
        .select(
          "quizTitle quizMode score correctAnswers wrongAnswers totalQuestions correctPercentage completionTime createdAt attemptDate userId",
        )
        .lean(),
    ]);

    const summary = userSummary?.[0] || {
      totalUsers: 0,
      activeUsers: 0,
      pendingUsers: 0,
      suspendedUsers: 0,
      blockedUsers: 0,
      lowRiskUsers: 0,
      mediumRiskUsers: 0,
      highRiskUsers: 0,
      averageSecurityScore: 0,
    };

    const averageSecurityScore = roundNumber(summary.averageSecurityScore);
    const averageRiskScore = roundNumber(100 - averageSecurityScore);

    const recentCampaignRows = recentCampaigns.map((campaign) => ({
      id: campaign._id,
      title: campaign.title,
      description: campaign.description || "",
      templateName: campaign.emailTemplateId?.templateName || "-",
      targetUsers: Array.isArray(campaign.targetUsers)
        ? campaign.targetUsers.length
        : 0,
      launchDate: campaign.launchDate || campaign.createdAt || null,
      createdAt: campaign.createdAt || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers: summary.totalUsers || 0,
          activeUsers: summary.activeUsers || 0,
          pendingUsers: summary.pendingUsers || 0,
          suspendedUsers: summary.suspendedUsers || 0,
          blockedUsers: summary.blockedUsers || 0,
          totalEmailTemplates: totalEmailTemplates || 0,
          activeEmailTemplates: activeEmailTemplates || 0,
          totalCampaignRuns: totalCampaignRuns || 0,
          totalQuizzes: totalQuizzes || 0,
          totalQuizAttempts: totalQuizAttempts || 0,
          uniqueQuizSolvers: uniqueQuizSolvers.length || 0,
          lowRiskUsers: summary.lowRiskUsers || 0,
          mediumRiskUsers: summary.mediumRiskUsers || 0,
          highRiskUsers: summary.highRiskUsers || 0,
          averageSecurityScore,
          averageRiskScore,
        },
        recentUsers,
        recentCampaigns: recentCampaignRows,
        recentQuizzes,
        recentTemplates,
        recentQuizAttempts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admin summary",
      error: error.message,
    });
  }
});

router.get(
  "/campaign-results/:campaignId",
  authMiddleWare,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      const { campaignId } = req.params;

      const campaign = await Campaign.findById(campaignId)
        .populate("emailTemplateId", "templateName subject")
        .lean();

      if (!campaign) {
        return res
          .status(404)
          .json({ success: false, message: "Campaign not found" });
      }

      const targetUserIds = Array.isArray(campaign.targetUsers)
        ? campaign.targetUsers
        : [];

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
          deviceType: latestResult?.deviceType || "Unknown",
          browser: latestResult?.browser || "-",
          location: latestResult?.location || {
            country: "-",
            region: "-",
            city: "-",
            coordinates: { lat: null, lon: null },
          },
        };
      });

      const totalTargetUsers = results.length;
      const totalEmailOpened = results.filter((row) => row.emailOpened).length;
      const totalLinkClicked = results.filter((row) => row.linkClicked).length;
      const pendingUsers = results.filter(
        (row) => !row.emailOpened && !row.linkClicked,
      ).length;
      const engagedUsers = results.filter(
        (row) => row.emailOpened || row.linkClicked,
      ).length;
      const desktopUsers = results.filter(
        (row) => row.deviceType === "Desktop",
      ).length;
      const mobileUsers = results.filter(
        (row) => row.deviceType === "Mobile",
      ).length;
      const tabletUsers = results.filter(
        (row) => row.deviceType === "Tablet",
      ).length;
      const unknownDeviceUsers = results.filter(
        (row) => row.deviceType === "Unknown",
      ).length;
      const resultsWithBrowser = results.filter(
        (row) => row.browser && row.browser !== "-",
      ).length;
      const resultsWithLocation = results.filter(
        (row) => row.location && row.location.city && row.location.city !== "-",
      ).length;

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
            desktopUsers,
            mobileUsers,
            tabletUsers,
            unknownDeviceUsers,
            resultsWithBrowser,
            resultsWithLocation,
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
  },
);

module.exports = router;
