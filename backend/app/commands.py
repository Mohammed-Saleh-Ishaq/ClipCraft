import re
from typing import Optional, Dict, Any

# Regular expression to match time formats
TIME_RE = re.compile(r"(\d{1,2}:\d{2}:\d{2}|\d+\.?\d*)")

def parse_trim_command(text: str, video_duration: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """Parse a trim command in natural language and return the start time and duration."""
    t = text.lower()
    if "trim" not in t:
        return None
    snap = "snap" in t  # detect snap flag

    m = re.search(r"trim (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)", t)
    if m:
        start = float(m.group(1))
        duration = float(m.group(2))
        return {"start": start, "duration": duration, "snap": snap}

    # "trim first 5 seconds"
    m = re.search(r"first (\d+(?:\.\d+)?) (?:seconds|s)", t)
    if m:
        seconds = float(m.group(1))
        return {"start": 0.0, "duration": seconds}

    # "trim last 10 seconds"
    m = re.search(r"last (\d+(?:\.\d+)?) (?:seconds|s)", t)
    if m and video_duration is not None:
        seconds = float(m.group(1))
        start = max(0.0, video_duration - seconds)
        return {"start": start, "duration": seconds}

    # "trim from 00:00:05 to 00:00:20"
    m = re.search(r"from (\d{1,2}:\d{2}:\d{2}) to (\d{1,2}:\d{2}:\d{2})", t)
    if m:
        def to_secs(hms: str) -> float:
            """Convert time in hh:mm:ss format to seconds."""
            h, m2, s = map(int, hms.split(':'))
            return h * 3600 + m2 * 60 + s

        s = to_secs(m.group(1))
        e = to_secs(m.group(2))
        return {"start": float(s), "duration": float(max(0, e - s))}
    # "trim 10 20" → start at 10s, duration 20s
    m = re.search(r"trim (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)", t)
    if m:
        start = float(m.group(1))
        duration = float(m.group(2))
        return {"start": start, "duration": duration}


    # Fallback: any number -> trim that many seconds from start
    m = re.search(r"(\d+(?:\.\d+)?) (?:seconds|s)", t)
    if m:
        seconds = float(m.group(1))
        return {"start": 0.0, "duration": seconds}

    return None

    

import whisper
import os

def generate_captions(video_path):
    model = whisper.load_model("base")
    result = model.transcribe(video_path)
    vtt_content = "WEBVTT\n\n"

    for segment in result["segments"]:
        start = format_timestamp(segment["start"])
        end = format_timestamp(segment["end"])
        text = segment["text"].strip()
        vtt_content += f"{start} --> {end}\n{text}\n\n"

    # Save .vtt file
    vtt_path = os.path.splitext(video_path)[0] + ".vtt"
    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write(vtt_content)
    
    return vtt_path

def format_timestamp(seconds: float) -> str:
    ms = int((seconds - int(seconds)) * 1000)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"

