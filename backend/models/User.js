// models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  avatar: String,
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastOnline: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
