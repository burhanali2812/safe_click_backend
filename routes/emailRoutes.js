const express = require("express");
const nodemailer = require("nodemailer");
const otpMap = new Map();
const Template = require("../models/emailTemplate");
const authMiddleWare = require("../MiddleWare/authMiddleware");
const User = require("../models/user");

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


function generateOTP() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}

router.post("/send-otp", async (req, res) => {
    console.log("SMTP Config:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? "******" : "Not Set",
});
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).send("Missing email or name");
  }
  const existingOTP = otpMap.get(email);
  if (existingOTP) {
    return res.status(429).send("OTP already sent. Please wait before requesting again.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).send("Invalid email format");
  }
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(404).send("Email not registered");
  }

  const otp = generateOTP();
  otpMap.set(email, otp);
  setTimeout(() => otpMap.delete(email), 60000);

const mailOptions = {
  from: `"Safe Click Security" <${process.env.SMTP_USER}>`,
  to: email,
  subject: "OTP Verification for Safe Click",
  html: `
    <div style="font-family: system-ui, sans-serif, Arial; font-size: 16px; color: #333; max-width: 600px; margin: auto; padding: 24px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #007BFF; margin: 0;">Safe Click</h1>
        <p style="color: #666; margin-top: 8px;">
          Security Awareness & Protection Platform
        </p>
      </div>

      <p style="border-top: 1px solid #eaeaea; padding-top: 16px;">
        <strong>Hello ${name},</strong>
      </p>

      <p style="margin-bottom: 16px;">
        To verify your identity and securely continue with Safe Click, please use the One-Time Password (OTP) below:
      </p>

      <p style="font-size: 32px; font-weight: bold; color: #007BFF; text-align: center; letter-spacing: 4px; margin: 24px 0;">
        ${otp}
      </p>

      <p style="text-align: center; font-size: 14px; color: #888; margin-bottom: 24px;">
        This OTP is valid for <strong>1 minute</strong>.
      </p>

      <div style="background: #eef5ff; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #333;">
          <strong>Security Reminder:</strong> Never share your OTP with anyone. Safe Click will never ask for your verification code, password, or sensitive credentials via email or phone.
        </p>
      </div>

      <p style="margin-bottom: 16px;">
        If you did not request this verification code, please ignore this email or contact support immediately.
      </p>

      <p style="font-size: 14px; color: #666;">
        Stay aware. Stay protected.<br/>
        <strong>Team Safe Click</strong>
      </p>

      <p style="margin-top: 32px; font-size: 13px; color: #999; text-align: center;">
        © 2026 Safe Click. All rights reserved.
      </p>
    </div>
  `,
};
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("OTP sent");
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).send("Failed to send OTP");
  }
});



router.post("/create", authMiddleWare, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
  try {
    const { templateName, subject, body } = req.body;

    if (!templateName || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "templateName, subject and body are required",
      });
    }

    const existingTemplate = await Template.findOne({ templateName });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "Template already exists",
      });
    }

    const template = await Template.create({
      templateName,
      subject,
      body, // HTML stored here
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET ALL TEMPLATES
router.get("/getAllTemplates", authMiddleWare, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

  try {
    const templates = await Template.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET SINGLE TEMPLATE
router.get("/getTemplate/:id", authMiddleWare, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE TEMPLATE
router.put("/updateTemplate/:id", authMiddleWare, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
  try {
    const { templateName, subject, body, isActive } = req.body;

    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      {
        templateName,
        subject,
        body,
        isActive,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE TEMPLATE
router.delete("/deleteTemplate/:id", authMiddleWare, async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
  try {
    const deletedTemplate = await Template.findByIdAndDelete(req.params.id);

    if (!deletedTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
