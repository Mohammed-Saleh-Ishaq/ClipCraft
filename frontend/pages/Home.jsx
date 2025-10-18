

import VideoPlayer from "../components/VideoPlayer";
import ChatBox from "../components/ChatBox";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";


export default function Home() {
  const playerRef = useRef(null);
  const [durationSec, setDurationSec] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [output, setOutput] = useState(null);
  const [captionsUrl, setCaptionsUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [showCaptions, setShowCaptions] = useState(true);

  const [captions, setCaptions] = useState([]); // editable caption objects {timestamp, text}
  const [trimRange, setTrimRange] = useState({ start: 0, end: 100 });
  const [snapToSentence, setSnapToSentence] = useState(false);
  const fileInputRef = useRef();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;


  useEffect(() => {
    return () => {
      if (captionsUrl) URL.revokeObjectURL(captionsUrl);
    };
  }, [captionsUrl]);
  useEffect(() => {
  if (!playerRef.current) return;
  const tryGetDuration = () => {
    const d = playerRef.current.getDuration();
    if (d && d > 0) setDurationSec(d);
  };
  tryGetDuration();
  const t = setTimeout(tryGetDuration, 500);
  return () => clearTimeout(t);
}, [videoUrl]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus(null);
    setOutput(null);
    setCaptions([]);
    setCaptionsUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`, {

        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setSelectedFileName(data.filename);
      setVideoUrl(`${process.env.NEXT_PUBLIC_BACKEND_URL}${data.url}`);
      setStatus({ type: "success", text: "Upload successful" });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: "Upload failed" });
    } finally {
      setLoading(false);
    }
  };
  
  const sendCommand = async (cmd) => {
    if (!selectedFileName) {
      alert("Please upload a video first!");
      return;
    }
    setStatus({ type: "info", text: "Processing..." });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("cmd", cmd);
      formData.append("filename", selectedFileName);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/command`, {

        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setOutput(data);

      if (data.action === "caption" && data.vtt_url) {
        const vttFull = `${process.env.NEXT_PUBLIC_BACKEND_URL}${data.vtt_url}`;
        setCaptionsUrl(vttFull);
        // Optionally fetch and parse captions into editable state
        try {
          const vttRes = await fetch(vttFull);
          const vttText = await vttRes.text();
          const parsed = parseVTT(vttText);
          setCaptions(parsed);
        } catch (e) {
          console.warn("Could not fetch/parse VTT", e);
        }
        setStatus({ type: "success", text: "Captions ready" });
      } else if (data.action === "trim" && data.url) {
        setVideoUrl(`${process.env.NEXT_PUBLIC_BACKEND_URL}${data.url}`);
        setStatus({ type: "success", text: "Trim completed" });
      } else if (data.action === "transcribe" && data.text) {
        setStatus({ type: "success", text: "Transcription ready" });
      } else {
        setStatus({ type: "info", text: data.message || "Done" });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: "Command failed" });
    } finally {
      setLoading(false);
    }
  };
  const percentToSeconds = (pct) => {
    const d = durationSec || playerRef.current?.getDuration() || 0;
    return Math.max(0, Math.min(d, (pct / 100) * d));
  };

  // Simple VTT parser for basic cues to {timestamp, text}
  function parseVTT(vttText) {
    const lines = vttText.split("\n");
    const cues = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      // Skip numeric cue ID if present
      if (/^\d+$/.test(line)) {
        i++;
        continue;
      }
      // time --> time
      if (line.includes("-->")) {
        const times = line.split("-->").map((s) => s.trim());
        const start = times[0];
        let text = "";
        i++;
        while (i < lines.length && lines[i].trim()) {
          text += (text ? " " : "") + lines[i].trim();
          i++;
        }
        cues.push({ timestamp: start, text });
      } else {
        i++;
      }
    }
    return cues;
  }

  const updateCaptionText = (idx, newText) => {
    setCaptions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text: newText };
      return copy;
    });
  };

  const removeCaption = (idx) => {
    setCaptions((prev) => prev.filter((_, i) => i !== idx));
  };

  
  const handleTrimChange = (key, value) => {
  setTrimRange((prev) => ({ ...prev, [key]: value }));
  if (key === "start" && playerRef.current) {
    const sec = percentToSeconds(value);
    playerRef.current.seek(sec);
  }
};


  const sendTrimRequest = async () => {
  if (!selectedFileName) {
    alert("Upload first");
    return;
  }
  const startSec = Math.round(percentToSeconds(trimRange.start));
  const endSec = Math.round(percentToSeconds(trimRange.end));
  const duration = endSec - startSec;
  if (duration <= 0) {
    alert("End must be greater than Start");
    return;
  }
  const cmd = `trim ${startSec} ${duration}`; // ✅ send full command string

  setStatus({ type: "info", text: `Trimming ${startSec}s → ${endSec}s` });
  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("cmd", cmd ); // ✅ send full command string
    formData.append("filename", selectedFileName);
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/command`, {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    setOutput(data);
    if (data.url) {
      setVideoUrl(`${process.env.NEXT_PUBLIC_BACKEND_URL}${data.url}`);

      setStatus({ type: "success", text: "Trim completed" });
    } else {
      setStatus({ type: "info", text: data.message || "Trim done" });
    }
  } catch (e) {
    console.error(e);
    setStatus({ type: "error", text: "Trim failed" });
  } finally {
    setLoading(false);
  }
};


  const exportVideo = async () => {
    if (!selectedFileName) {
      alert("Upload first");
      return;
    }
    setStatus({ type: "info", text: "Exporting..." });
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("cmd", "export");
      formData.append("filename", selectedFileName);
      // Send preferences (example)
      formData.append("burn_in", document.getElementById("burnIn")?.checked ? "1" : "0");
      formData.append("srt_only", document.getElementById("srtOnly")?.checked ? "1" : "0");

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/command`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setOutput(data);
      setStatus({ type: "success", text: "Export started" });
    } catch (e) {
      console.error(e);
      setStatus({ type: "error", text: "Export failed" });
    } finally {
      setLoading(false);
    }
  };

  const undoLast = () => {
    // placeholder undo UI action
    setStatus({ type: "info", text: "Undo not implemented" });
  };

  return (
    <div className="page-root">
      <motion.header
        className="hero"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="hero-left">
          <h1 className="hero-title">From captioning to trimming — built for access.</h1>
          <p className="hero-sub">AI-powered video caption generator & editor.</p>

          <motion.button
            className={`primary-btn ${loading ? "disabled" : ""}`}
            onClick={() => fileInputRef.current.click()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            ⚡ Edit a video
          </motion.button>

          <input
            ref={fileInputRef}
            id="fileUpload"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        <div className="hero-right">
          <div className="top-controls">
            <button className="icon-btn">Settings</button>
            <button className="icon-btn">Help</button>
          </div>
        </div>
      </motion.header>

      <main className="content">
        <section className="left-column">
          <motion.div
            className="video-card"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {videoUrl ? (
                <>
                <VideoPlayer ref={playerRef} src={videoUrl} captions={showCaptions ? captionsUrl : null} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => playerRef.current?.play()} className="secondary-btn">Play</button>
                    <button onClick={() => playerRef.current?.pause()} className="secondary-btn">Pause</button>
                    <button onClick={() => playerRef.current?.skip(5)} className="secondary-btn">Skip 5s</button>
                </div>
                </>


            ) : (
              <div className="empty-player">
                <div>
                  <div className="empty-emoji">🎬</div>
                  <div className="empty-text">No video uploaded yet</div>
                  <div className="empty-sub">Click “Edit a video” to start</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Trim Section */}
          <motion.div
            className="card trim-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="card-header">
              <h3>✂️ Trim Video</h3>
              <div className="small-muted">Select start and end percent</div>
            </div>

            <div className="trim-controls">
              <label>Start: {trimRange.start}% ({Math.round(percentToSeconds(trimRange.start))}s)</label>
              <input
                type="range"
                min="0"
                max="99"
                value={trimRange.start}
                onChange={(e) => handleTrimChange("start", Number(e.target.value))}
              />
              <label>End: {trimRange.end}% ({Math.round(percentToSeconds(trimRange.end))}s)</label>
              <input
                type="range"
                min="1"
                max="100"
                value={trimRange.end}
                onChange={(e) => handleTrimChange("end", Number(e.target.value))}
              />
            </div>

            

            <div className="card-actions">
              <button className="secondary-btn" 
              onClick={sendTrimRequest} disabled={loading}>
                Trim
              </button>
            </div>
          </motion.div>

          {/* Preferences / Export */}
          <motion.div
            className="card prefs-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="card-header">
              <h3>⚙️ Preferences</h3>
            </div>

            <div className="prefs-list">
              
              <label className="checkbox-row">
                <input id="srtOnly" type="checkbox" />
                <span>Export .SRT Only</span>
              </label>
            </div>

            <div className="card-actions between">
              <button className="tertiary-btn" onClick={undoLast}>
                Undo
              </button>
              <button className="primary-btn" onClick={exportVideo} disabled={loading}>
                Export (H.264 MP4)
              </button>
            </div>
          </motion.div>
        </section>

        <aside className="right-column">
          <motion.div
            className="card captions-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="card-header">
              <h3>🗨️ Captions</h3>
              <div className="small-muted">Edit captions, timestamps or export</div>
            </div>

            <div className="captions-list">
              {captions.length === 0 ? (
                <div className="muted">No captions loaded. Generate or run a caption command.</div>
              ) : (
                captions.map((c, idx) => (
                  <div key={idx} className="caption-row">
                    <div className="caption-time">{c.timestamp}</div>
                    <input
                      className="caption-input"
                      value={c.text}
                      onChange={(e) => updateCaptionText(idx, e.target.value)}
                    />
                    <button className="icon-sm" onClick={() => removeCaption(idx)}>
                      ✖
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="caption-actions">
              <button
                className="secondary-btn"
                onClick={() => {
                  sendCommand("caption");
                }}
              >
                Generate Captions
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  sendCommand("translate");
                }}
              >
                Auto-Translate
              </button>
              <button
                className="secondary-btn"
                onClick={sendTrimRequest} 
              >
                Trim
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  sendCommand("style");
                }}
              >
                Apply Style
              </button>
            </div>

            <label className="inline-toggle">
              <span>Show Captions</span>
              <input
                type="checkbox"
                checked={showCaptions}
                onChange={(e) => setShowCaptions(e.target.checked)}
              />
            </label>
          </motion.div>
          <div className="chatbox-wrapper">
            <ChatBox onSend={sendCommand} compact />
          </div>


          {/* Transcription / Debug */}
          {output && output.text && (
            <motion.div
              className="card transcript-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <strong>📝 Transcription</strong>
              <div className="transcript-text">{output.text}</div>
            </motion.div>
          )}

          
        </aside>
      </main>

      {/* Floating status */}
      <div className="status-area">
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`status-pill ${status.type}`}
          >
            {status.text}
          </motion.div>
        )}
      </div>
    </div>
  );
}

