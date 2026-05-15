const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        default: "user"
    },

    securityScore: {
        type: Number,
        default: 100
    },

    riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low"
    },

    lastLogin: {
        type: Date,
        default: null
    },

    failedLoginAttempts: {
        type: Number,
        default: 0
    },

    accountStatus: {
        type: String,
        enum: ["active", "suspended", "blocked"],
        default: "active"
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model("User", userSchema);