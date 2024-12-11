/* eslint-disable react/prop-types */
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

const VideoControls = ({
  isMuted,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
}) => {
  return (
    <div className="flex justify-center space-x-4 mt-4">
      <button
        onClick={onToggleAudio}
        className={`p-2 rounded-full ${
          isMuted ? "bg-red-500" : "bg-green-500"
        } text-white`}
      >
        {isMuted ? <MicOff /> : <Mic />}
      </button>
      <button
        onClick={onToggleVideo}
        className={`p-2 rounded-full ${
          isVideoEnabled ? "bg-green-500" : "bg-red-500"
        } text-white`}
      >
        {isVideoEnabled ? <Video /> : <VideoOff />}
      </button>
    </div>
  );
};

export default VideoControls;
