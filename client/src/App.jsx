import { useState } from "react";
import io from "socket.io-client";
import Chat from "./components/Chat";

const PORT = "3001";
const SERVER_URL = `http://localhost:${PORT}`;
const socket = io(SERVER_URL);

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);

  const joinRoom = () => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", { username, room });
      setShowChat(true);
    }
  };

  return (
    <div className="px-8 flex items-center justify-center text-white bg-[url(/src/assets/background.jpg)] bg-no-repeat bg-cover w-full h-screen">
      {!showChat ? (
        <div className="w-fit flex flex-col justify-center items-center text-center space-y-2 bg-white/10 backdrop-blur-sm rounded-xl py-8 px-4">
          <input
            type="text"
            placeholder="Your nickname"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
            className="outline-none text-black p-2 rounded-md overflow-hidden w-[300px]"
          />
          <input
            type="text"
            placeholder="Room ID"
            onChange={(e) => setRoom(e.target.value)}
            value={room}
            className="outline-none text-black p-2 rounded-md overflow-hidden md:max-w-96 w-[300px]"
          />
          <button
            onClick={joinRoom}
            className="p-2 bg-blue-500 hover:bg-blue-700 rounded-md font-medium w-[300px]"
          >
            Join a Room
          </button>
        </div>
      ) : (
        <Chat socket={socket} username={username} room={room} />
      )}
    </div>
  );
}

export default App;
