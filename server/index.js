const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const PORT = 3001;
const CORS_ORIGIN = "http://localhost:5173";

const users = {};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

const fs = require('fs');
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

const app = express();
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    res.json({ filePath: `http://localhost:3001/uploads/${req.file.filename}` });
});

const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`User  Connected: ${socket.id}`);

    socket.on("join_room", ({ username, room }) => {
        if (users[username]) {
            socket.leave(users[username].room);
        }
        users[username] = { room, socketId: socket.id };
        socket.join(room);
        console.log(`${username} joined room: ${room}`);

        socket.to(room).emit("receive_message", {
            author: "",
            message: `${username} has joined the room.`,
            time: new Date().toLocaleTimeString(),
        });
    });

    socket.on("send_message", (data) => {
        console.log("Message received:", data);
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("send_file", (data) => {
        console.log("File received:", data);
        socket.to(data.room).emit("receive_file", data);
    });

    socket.on("disconnect", () => {
        console.log(`User  Disconnected: ${socket.id}`);
    });

    socket.on("reconnect_user", (username) => {
        if (users[username]) {
            const { room } = users[username];
            socket.join(room);
            console.log(`${username} reconnected to room: ${room}`);
            socket.to(room).emit("user_reconnected", { username });
        }
    });
});

server.listen(PORT, () => {
    console.log("SERVER RUNNING ON PORT", PORT);
});