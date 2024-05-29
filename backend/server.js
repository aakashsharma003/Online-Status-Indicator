// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const moment = require("moment");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// MongoDB model
const User = require("./models/User");

// Setup Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// console.log(process.env);
// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT
const verifyJWT = (req, res, next) => {
  const token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send("Token is required");
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
};

app.post("/login", async (req, res) => {
  const { username, avatar } = req.body;
  let user = await User.findOne({ username });

  if (!user) {
    user = new User({ username, avatar });
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: 86400, // 24 hours
  });

  res.json({ userId: user._id, username: user.username, token });
});

// Protected route example
app.get("/profile", verifyJWT, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json(user);
});

// When a new client connects
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("user-online", async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastOnline: null,
      });
      const users = await User.find({});
      io.emit("users-status", users);
    } catch (err) {
      console.error("Invalid token:", err);
    }
  });

  // Heartbeat mechanism
  const heartbeats = {};

  socket.on("heartbeat", () => {
    const userId = socket.userId;
    if (userId) {
      heartbeats[userId] = Date.now();
    }
  });

  setInterval(async () => {
    const now = Date.now();
    for (const userId in heartbeats) {
      if (now - heartbeats[userId] > 1000) {
        // User has likely disconnected
        delete heartbeats[userId];
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastOnline: moment().toISOString(),
        });
        const users = await User.find({});
        io.emit("users-status", users);
      }
    }
  }, 500);

  socket.on("disconnect", async () => {
    const userId = socket.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastOnline: moment().toISOString(),
      });
      const users = await User.find({});
      io.emit("users-status", users);
    }
    console.log("Client disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
