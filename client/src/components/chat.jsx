/* eslint-disable react/prop-types */
import { useEffect, useState, useRef } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import IconSendFill from "./IconSendFill";
import { IoMdDownload } from "react-icons/io";
import SocketIOFileUpload from "socketio-file-upload";
import VideoChat from "./VideoChat";

const Chat = ({ socket, username, room }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [file, setFile] = useState(null);
  const [users, setUsers] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const uploader = new SocketIOFileUpload(socket);
    uploader.listenOnInput(fileInputRef.current);

    uploader.addEventListener("start", (event) => {
      event.file.meta.username = username;
      event.file.meta.room = room;
      event.file.meta.type = event.file.type;
    });

    uploader.addEventListener("complete", (event) => {
      console.log("File upload complete:", event.file);
      const fileMessage = {
        room,
        id: socket.id,
        author: username,
        fileName: event.file.name,
        filePath: `http://localhost:3001/uploads/${event.file.name}`,
        fileType: event.file.type,
        time: new Date().toLocaleTimeString(),
      };
      setMessageList((prev) => [...prev, fileMessage]);
      setFile(null);
    });

    socket.on("receive_message", (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    socket.on("receive_file", (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    socket.on("update_users", (updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      socket.off("receive_message");
      socket.off("receive_file");
      socket.off("update_users");
    };
  }, [socket, username, room]);

  const sendMessage = () => {
    if (currentMessage !== "") {
      const message = {
        room,
        id: socket.id,
        author: username,
        message: currentMessage,
        time: new Date().toLocaleTimeString(),
      };
      setMessageList((prev) => [...prev, message]);
      socket.emit("send_message", message);
      setCurrentMessage("");
    }
  };

  const handleSend = () => {
    if (currentMessage) {
      sendMessage();
    } else if (file) {
      fileInputRef.current?.dispatchEvent(new MouseEvent("click"));
    }
  };

  return (
    <div className="w-full bg-white/10 backdrop-blur-md rounded-xl pb-8 pt-4 px-4">
      <div className="w-full py-3 mb-2 bg-slate-900 text-white font-bold text-center cursor-default">
        <p>Room: {room}</p>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <VideoChat
            socket={socket}
            username={username}
            room={room}
            users={users}
          />
        </div>
        <div className="w-full md:w-1/2">
          <div className="bg-transparent h-[70vh]">
            <ScrollToBottom
              className="w-full h-full overflow-x-hidden overflow-y-scroll no-scrollbar"
              scrollViewClassName="flex flex-col"
            >
              {messageList.map((message, index) => (
                <div
                  key={index}
                  className={`flex flex-col p-2.5 mb-2 rounded-md w-[70%] sm:w-80 ${
                    message.id === socket.id
                      ? "bg-blue-600 self-end"
                      : "bg-slate-800 self-start"
                  }`}
                >
                  <p className="font-bold">{message.author}</p>
                  {message.message ? (
                    <p>{message.message}</p>
                  ) : (
                    <div className="file-preview">
                      {message.fileType?.startsWith("image/") ? (
                        <div className="relative">
                          <img
                            src={message.filePath}
                            alt={message.fileName}
                            className="max-w-full h-auto rounded-md"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1">
                            <a
                              href={message.filePath}
                              download={message.fileName}
                              className="flex items-center text-white"
                              title="Download"
                            >
                              <IoMdDownload className="w-6 h-6" />
                            </a>
                          </div>
                        </div>
                      ) : message.fileType === "application/pdf" ? (
                        <div className="relative">
                          <iframe
                            src={message.filePath}
                            title={message.fileName}
                            className="w-full h-48"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1">
                            <a
                              href={message.filePath}
                              download={message.fileName}
                              className="flex items-center text-white"
                              title="Download"
                            >
                              <IoMdDownload className="w-6 h-6" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <a
                            href={message.filePath}
                            download={message.fileName}
                            className="text-blue-400 underline flex-1"
                          >
                            {message.fileName}
                          </a>
                          <a
                            href={message.filePath}
                            download={message.fileName}
                            className="ml-2"
                            title="Download"
                          >
                            <IoMdDownload className="w-5 h-5 text-white cursor-pointer" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-sm font-light text-end">{message.time}</p>
                </div>
              ))}
            </ScrollToBottom>
          </div>
          <div className="flex flex-row justify-between items-center bg-slate-900 p-2 overflow-hidden rounded-md space-x-2 mt-4">
            <input
              type="text"
              placeholder="Type here"
              onChange={(e) => setCurrentMessage(e.target.value)}
              value={currentMessage}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="outline-none bg-transparent flex-1 text-white"
            />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              ref={fileInputRef}
            />
            <IconSendFill
              onClick={handleSend}
              className="cursor-pointer text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
