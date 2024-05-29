import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import moment from "moment";
import axios from "axios";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import "./App.css";

const Server = "https://online-status-indicator.onrender.com";

function App() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUserId = localStorage.getItem("userId");
    if (savedToken && savedUserId) {
      setToken(savedToken);
      setUserId(savedUserId);
    }
  }, []);

  useEffect(() => {
    if (userId && token) {
      const socket = io(Server);

      socket.emit("user-online", token);

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          socket.emit("user-online", token);
        } else {
          socket.emit("disconnect");
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Heartbeat mechanism
      const heartbeatInterval = setInterval(() => {
        socket.emit("heartbeat");
      }, 500);

      socket.on("users-status", (users) => {
        setUsers(users);
      });

      return () => {
        socket.disconnect();
        clearInterval(heartbeatInterval);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [userId, token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${Server}/login`, {
        username,
        avatar,
      });
      const { userId, token } = response.data;
      setUserId(userId);
      setToken(token);
      localStorage.setItem("userId", userId);
      localStorage.setItem("token", token);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: "50px" }}>
      {!userId ? (
        <Box
          component="form"
          onSubmit={handleLogin}
          noValidate
          sx={{ mt: 1, bgcolor: "azure", padding: "2rem" }}
        >
          <Typography component="h1" variant="h5" align="center">
            Login
          </Typography>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            fullWidth
            id="avatar"
            label="Avatar URL"
            name="avatar"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Login"}
          </Button>
        </Box>
      ) : (
        <>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Online Users
          </Typography>
          <List>
            {users.map((user) => (
              <ListItem key={user._id} className="user-item">
                <ListItemAvatar
                  sx={{
                    bgcolor: "azure",
                    borderRadius: "40%",
                    padding: "2%",
                    width: "80px",
                    height: "80px",
                    marginRight: "10px",
                  }}
                >
                  <Avatar
                    src={user.avatar}
                    alt={user.username}
                    sx={{ width: "100%", height: "100%" }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={user.username}
                  secondary={
                    user.isOnline ? (
                      <>
                        <span className="online-dot"></span>
                        <span style={{ color: "green", marginLeft: "0.6rem" }}>
                          Online
                        </span>
                      </>
                    ) : (
                      `Last Online: ${moment(user.lastOnline).fromNow()}`
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Container>
  );
}

export default App;
