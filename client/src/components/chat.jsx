/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import IconSendFill from "./IconSendFill";
import { IoMdDownload } from "react-icons/io";

const Chat = ({ socket, username, room }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [file, setFile] = useState(null);

  const sendMessage = () => {
    if (currentMessage !== "") {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;

      const message = {
        room,
        id: socket.id,
        author: username,
        message: currentMessage,
        time: timeString,
      };
      setMessageList((prev) => [...prev, message]);
      socket.emit("send_message", message);
      setCurrentMessage("");
    }
  };

  const uploadFile = async () => {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("http://localhost:3001/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.filePath) {
          const fileMessage = {
            room,
            id: socket.id,
            author: username,
            fileName: file.name,
            filePath: data.filePath,
            fileType: file.type,
            time: new Date().toLocaleTimeString(),
          };
          setMessageList((prev) => [...prev, fileMessage]);
          socket.emit("send_file", fileMessage);
          setFile(null);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
  };

  const handleSend = () => {
    if (currentMessage) {
      sendMessage();
    } else {
      uploadFile();
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    socket.on("receive_file", (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
      socket.off("receive_file");
    };
  }, [socket]);

  return (
    <div className="w-full bg-white/10 backdrop-blur-md rounded-xl pb-8 pt-4 px-4">
      <div className="w-full py -3 mb-2 bg-slate-900 text-white font-bold text-center cursor-default">
        <p>Room: {room}</p>
      </div>
      <div className="bg-transparent h-[70vh]">
        <ScrollToBottom
          className="w-full h-full overflow-x-hidden overflow-y-scroll no-scrollbar"
          scrollViewClassName="flex flex-col"
        >
          {messageList.map((message, index) => {
            return (
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
                    {message.fileType.startsWith("image/") ? (
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
            );
          })}
        </ScrollToBottom>
      </div>
      <div className="flex flex-row justify-between items-center bg-slate-900 p-2 overflow-hidden rounded-md space-x-2">
        <input
          type="text"
          placeholder="Type here"
          onChange={(e) => setCurrentMessage(e.target.value)}
          value={currentMessage}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="outline-none bg-transparent flex-1"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          id="fileInput"
        />
        <IconSendFill
          onClick={handleSend}
          className="cursor-pointer text-white"
        />
      </div>
    </div>
  );
};

export default Chat;
