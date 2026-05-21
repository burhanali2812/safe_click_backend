const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const mongoSanitize = require("express-mongo-sanitize");



const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});



const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(mongoSanitize());
app.use(limiter);

// Import routes
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const emailTemplateRoutes = require("./routes/emailRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const quizRoutes = require("./routes/quizRoutes");
const simulationRoutes = require("./routes/simulationRoutes");

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("SafeClick Backend is Live!");
});
app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next();
});
// Use routes
app.use("/api/users", userRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/simulations", simulationRoutes);
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server Running on PORT ${PORT}`);
  });
});
