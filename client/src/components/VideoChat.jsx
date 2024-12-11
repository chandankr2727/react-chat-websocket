/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback } from "react";
import VideoControls from "./VideoControls";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

const VideoChat = ({ socket, username, room, users }) => {
  const [localStream, setLocalStream] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const peerConnections = useRef({});
  const dataChannels = useRef({});

  const addVideoStream = useCallback(
    (userId, stream, isLocal = false) => {
      console.log(
        `Adding ${isLocal ? "local" : "remote"} video stream for user:`,
        userId
      );
      const videoContainer = document.createElement("div");
      videoContainer.id = `video-container-${userId}`;
      videoContainer.className = "relative aspect-w-16 aspect-h-9";

      const video = document.createElement("video");
      video.id = `video-${userId}`;
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = isLocal; // Mute local video to prevent echo
      video.className = "rounded-md w-full h-full object-cover";

      const label = document.createElement("div");
      label.textContent = isLocal
        ? `${username} (You)`
        : users.find((user) => user.socketId === userId)?.username || "Unknown";
      label.className =
        "absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-sm";

      videoContainer.appendChild(video);
      videoContainer.appendChild(label);

      const videosContainer = isLocal
        ? document.getElementById("local-video")
        : document.getElementById("remote-videos");
      if (videosContainer) {
        const existingVideo = document.getElementById(
          `video-container-${userId}`
        );
        if (existingVideo) {
          videosContainer.removeChild(existingVideo);
        }
        videosContainer.appendChild(videoContainer);
      } else {
        console.error(
          `${isLocal ? "Local" : "Remote"} videos container not found`
        );
      }
    },
    [username, users]
  );

  const createPeerConnection = useCallback(
    (targetId) => {
      if (peerConnections.current[targetId]) {
        console.log("Peer connection already exists for:", targetId);
        return peerConnections.current[targetId];
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice_candidate", {
            candidate: event.candidate,
            targetId,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log("Received remote track from:", targetId);
        addVideoStream(targetId, event.streams[0]);
      };

      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription(await pc.createOffer());
          socket.emit("offer", { offer: pc.localDescription, targetId });
        } catch (err) {
          console.error("Error during negotiation:", err);
        }
      };

      const dc = pc.createDataChannel("chat");
      dc.onmessage = (event) => console.log("Received message:", event.data);
      dataChannels.current[targetId] = dc;

      peerConnections.current[targetId] = pc;
      return pc;
    },
    [socket, addVideoStream]
  );

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }, []);

  const endCall = useCallback(() => {
    socket.emit("end_call", { room, ender: username });
    setIsInCall(false);
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    dataChannels.current = {};
    const remoteVideos = document.getElementById("remote-videos");
    while (remoteVideos?.firstChild) {
      remoteVideos.removeChild(remoteVideos.firstChild);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [socket, room, username, localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  }, [localStream]);

  useEffect(() => {
    if (localStream) {
      addVideoStream(socket.id, localStream, true);
    }
  }, [addVideoStream, localStream, socket.id, username]);

  useEffect(() => {
    socket.on("user_joined", async ({ username: newUser, id: newUserId }) => {
      console.log("User  joined:", newUser, newUserId);
      if (isInCall && localStream) {
        const pc = createPeerConnection(newUserId);
        localStream
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStream));
      }
    });

    socket.on("ice_candidate", ({ candidate, from }) => {
      console.log("Received ICE candidate from:", from);
      peerConnections.current[from]?.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Received offer from:", from);
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, targetId: from });

      if (localStream) {
        localStream
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStream));
      }
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Received answer from:", from);
      await peerConnections.current[from].setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("user_left", ({ id }) => {
      console.log("User  left:", id);
      if (peerConnections.current[id]) {
        peerConnections.current[id].close();
        delete peerConnections.current[id];
      }
      if (dataChannels.current[id]) {
        delete dataChannels.current[id];
      }
      removeVideoStream(id);
    });

    socket.on("incoming_call", ({ caller }) => {
      setIncomingCall(caller);
    });

    socket.on("call_accepted", async ({ accepter }) => {
      console.log("Call accepted by:", accepter);
      setIsInCall(true);
      setIncomingCall(null);
      if (!localStream) {
        await getLocalStream();
      }
    });

    socket.on("call_rejected", () => {
      setIncomingCall(null);
    });

    socket.on("call_ended", () => {
      endCall();
    });

    return () => {
      socket.off("user_joined");
      socket.off("ice_candidate");
      socket.off("offer");
      socket.off("answer");
      socket.off("user_left");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("call_ended");
    };
  }, [
    socket,
    isInCall,
    localStream,
    createPeerConnection,
    getLocalStream,
    endCall,
  ]);

  const removeVideoStream = (userId) => {
    const videoElement = document.getElementById(`video-container-${userId}`);
    if (videoElement) {
      videoElement.remove();
    }
  };

  const startCall = async () => {
    const stream = await getLocalStream();
    if (stream) {
      socket.emit("initiate_call", { room, caller: username });
      setIsInCall(true);
    }
  };

  const acceptCall = async () => {
    const stream = await getLocalStream();
    if (stream) {
      socket.emit("accept_call", { room, accepter: username });
      setIsInCall(true);
      setIncomingCall(null);
    }
  };

  const rejectCall = () => {
    socket.emit("reject_call", { room, rejecter: username });
    setIncomingCall(null);
  };

  return (
    <div className="bg-slate-900 p-4 rounded-md">
      <h2 className="text-xl font-bold mb-4 text-white">Video Chat</h2>
      {isInCall ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div id="local-video" className="aspect-w-16 aspect-h-9">
              {/* Local video will be added here dynamically */}
            </div>
            <div id="remote-videos" className="grid grid-cols-1 gap-4">
              {/* Remote video streams will be added here dynamically */}
            </div>
          </div>
          <VideoControls
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
          />
          <button
            onClick={endCall}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            End Call
          </button>
        </>
      ) : (
        <div>
          {incomingCall ? (
            <div>
              <p className="mb-2 text-white">
                Incoming call from {incomingCall}
              </p>
              <button
                onClick={acceptCall}
                className="mr-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={rejectCall}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          ) : (
            <button
              onClick={startCall}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Start Video Call
            </button>
          )}
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2 text-white">Users in Room</h3>
        <ul className="list-disc list-inside">
          {users.map((user) => (
            <li key={user.socketId} className="text-white">
              {user.username}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VideoChat;
