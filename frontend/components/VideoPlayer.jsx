import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";

const VideoPlayer = forwardRef(({ src, captions }, ref) => {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    const onTime = () => setCurrent(v.currentTime || 0);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [src]);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    skip: (seconds = 5) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds);
    },
    seek: (seconds) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = Math.min(Math.max(0, seconds), videoRef.current.duration || 0);
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getDuration: () => videoRef.current?.duration || 0,
  }), []);

  return (
    <div className="video-player-wrap">
      <video
        ref={videoRef}
        className="video-player"
        src={src}
        controls={false}
        crossOrigin="anonymous"
      >
        {captions && <track label="English" kind="subtitles" srcLang="en" src={captions} default />}
      </video>

      <div className="player-controls">
        <button className="control-btn" onClick={() => videoRef.current && videoRef.current.play()}>Play</button>
        <button className="control-btn" onClick={() => videoRef.current && videoRef.current.pause()}>Pause</button>
        <button className="control-btn" onClick={() => {
          const seconds = 5;
          if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds);
        }}>Skip</button>

        <div className="player-timeline">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={current}
            onChange={(e) => {
              const sec = Number(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = sec;
            }}
          />
          <div className="time-labels" style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>
            <span>{formatTime(current)}</span> / <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

function formatTime(s = 0) {
  if (!isFinite(s)) return "0:00";
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  const min = Math.floor(s / 60);
  return `${min}:${sec}`;
}

export default VideoPlayer;
