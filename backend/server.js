require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const connectDB = require("./config/db");
const configurePassport = require("./config/passport");
const security = require("./middleware/securityMiddleware");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

app.disable("x-powered-by");
app.use(security);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(cookieParser());

configurePassport();
app.use(passport.initialize());

// Serve static frontend demo
app.use("/app", express.static(path.join(__dirname, "../frontend")));
app.use("/frontend", express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.json({
    message: "Enterprise Multi-Tenant Security Gateway is running",
    version: "v1",
    frontendUrl: "/app"
  });
});

app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/employee", require("./routes/employeeRoutes"));
app.use("/api/v1/payroll", require("./routes/payrollRoutes"));
app.use("/api/v1/users", require("./routes/userRoutes"));

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}).catch(err => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});