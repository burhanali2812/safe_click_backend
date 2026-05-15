const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const authMiddleWare = require("../MiddleWare/authMiddleware");

const router = express.Router();


router.post("/register", async (req, res) => {
 
  try {
    const { name, email, password } = req.body;
    let status = "active";
    if(!password){
        password = "defaultPassword123";
        status = "pending"; // Set account status to pending if no password is provided
    }


    // Validation
    if (!name || !email ) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      accountStatus: status
    });

    await newUser.save();


    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check account status
    if (
      user.accountStatus === "blocked" ||
      user.accountStatus === "suspended"
    ) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}`,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      await user.save();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        securityScore: user.securityScore,
        riskLevel: user.riskLevel,
        accountStatus: user.accountStatus,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
});



// Get current user profile
router.get("/profile", authMiddleWare, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
});

// Get user by ID
router.get("/:id", authMiddleWare, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
});

// Update user profile
router.put("/profile", authMiddleWare, async (req, res) => {
  try {
    const { name, email } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: email,
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
});

// Change password
router.patch("/change-password", authMiddleWare, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide current password, new password, and confirmation",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user.id);

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
});

// Delete user account
router.delete("/profile", authMiddleWare, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message: "User account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting account",
      error: error.message,
    });
  }
});

// ============================================
// USER MANAGEMENT ROUTES (ADMIN ONLY)
// ============================================

// Get all users
router.get("/", authMiddleWare, async (req, res) => {
  try {
    // Optional: Add admin check if needed
    // if (req.user.role !== "admin") {
    //     return res.status(403).json({
    //         success: false,
    //         message: "Access denied. Admin only"
    //     });
    // }

    const { role, accountStatus, riskLevel, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (role) filter.role = role;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (riskLevel) filter.riskLevel = riskLevel;

    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
});

// Update user by ID (Admin)
router.put("/:id", authMiddleWare, async (req, res) => {
  try {
    // Optional: Add admin check
    // if (req.user.role !== "admin") {
    //     return res.status(403).json({
    //         success: false,
    //         message: "Access denied. Admin only"
    //     });
    // }

    const { name, email, role } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      const existingUser = await User.findOne({
        email: email,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }
      updateData.email = email;
    }
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
});

// Update account status
router.patch("/:id/status", authMiddleWare, async (req, res) => {
  try {
    const { accountStatus } = req.body;

    if (!["active", "suspended", "blocked"].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Account status updated to ${accountStatus}`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating account status",
      error: error.message,
    });
  }
});

// Update security score
router.patch("/:id/security-score", authMiddleWare, async (req, res) => {
  try {
    const { securityScore } = req.body;

    if (
      typeof securityScore !== "number" ||
      securityScore < 0 ||
      securityScore > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Security score must be a number between 0 and 100",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { securityScore },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Security score updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating security score",
      error: error.message,
    });
  }
});

// Update risk level
router.patch("/:id/risk-level", authMiddleWare, async (req, res) => {
  try {
    const { riskLevel } = req.body;

    if (!["low", "medium", "high"].includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: "Risk level must be 'low', 'medium', or 'high'",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { riskLevel },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Risk level updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating risk level",
      error: error.message,
    });
  }
});

// Get user security metrics
router.get("/:id/security-metrics", authMiddleWare, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "securityScore riskLevel failedLoginAttempts lastLogin accountStatus",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      metrics: {
        securityScore: user.securityScore,
        riskLevel: user.riskLevel,
        failedLoginAttempts: user.failedLoginAttempts,
        lastLogin: user.lastLogin,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching security metrics",
      error: error.message,
    });
  }
});

// Reset failed login attempts
router.patch("/:id/reset-failed-attempts", authMiddleWare, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { failedLoginAttempts: 0 },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Failed login attempts reset",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error resetting failed attempts",
      error: error.message,
    });
  }
});

module.exports = router;
