import shutil
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import whisper
from .utils import run_ffmpeg_trim, MEDIA_DIR, get_duration, cleanup_old_media
from .commands import parse_trim_command


# Initialize FastAPI app
app = FastAPI()

# CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, change for production use
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Load whisper model at startup (small/base recommended for MVP)
MODEL = whisper.load_model("small")

# Upload video endpoint
@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    out_path = MEDIA_DIR / filename
    with out_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": filename, "url": f"/media/{filename}"}

# Serve media endpoint to retrieve uploaded videos
@app.get("/media/{filename}")
async def serve_media(filename: str):
    p = MEDIA_DIR / filename
    if not p.exists():
        return JSONResponse({"error": "not found"}, status_code=404)
    return FileResponse(str(p))

# Command endpoint to handle video editing and transcription
@app.post("/command")
async def command(cmd: str = Form(...), filename: str = Form(...)):
    """Receive a text command and run supported edits. Returns new filename or captions."""

    file_path = MEDIA_DIR / filename
    if not file_path.exists():
        return JSONResponse({"error": "file not found"}, status_code=404)

    # Get video duration
    duration = get_duration(str(file_path))

    # Parse the command to see if it's a trim command
    parsed = parse_trim_command(cmd, video_duration=duration)
    if parsed:
        out_name = f"{uuid.uuid4().hex}_trim_{filename}"
        out_path = MEDIA_DIR / out_name
        run_ffmpeg_trim(str(file_path), parsed["start"], parsed["duration"], str(out_path))

        # Run cleanup of old media
        cleanup_old_media(MEDIA_DIR, max_age_hours=24)

        return {"action": "trim", "filename": out_name, "url": f"/media/{out_name}"}

    # Caption or transcription request using whisper
    if "caption" in cmd.lower() or "subtitle" in cmd.lower() or "transcribe" in cmd.lower():
        try:
            # Use the preloaded MODEL for speed
            result = MODEL.transcribe(str(file_path))
        except Exception as e:
            return JSONResponse({"action": "error", "message": f"Transcription failed: {str(e)}"}, status_code=500)

        # If no text or segments found -> friendly response
        text = result.get("text", "").strip()
        segments = result.get("segments", [])
        if not text or len(segments) == 0:
            return {"action": "none", "message": "No speech detected or transcription empty."}

        # Build VTT content using whisper segments (accurate timestamps)
        vtt_lines = ["WEBVTT\n"]
        for seg in segments:
            start = seg.get("start", 0.0)
            end = seg.get("end", 0.0)

            def fmt(ts):
                ms = int((ts - int(ts)) * 1000)
                h = int(ts // 3600)
                m = int((ts % 3600) // 60)
                s = int(ts % 60)
                return f"{h:02}:{m:02}:{s:02}.{ms:03}"

            vtt_lines.append(f"{fmt(start)} --> {fmt(end)}")
            vtt_lines.append(seg.get("text", "").strip())
            vtt_lines.append("")  # blank line

        vtt_content = "\n".join(vtt_lines)
        vtt_path = str(Path(str(file_path)).with_suffix(".vtt"))

        # Save vtt file
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write(vtt_content)

        # Run cleanup of old media
        cleanup_old_media(MEDIA_DIR, max_age_hours=24)

        # Return vtt URL + full transcription text for frontend display
        vtt_filename = Path(vtt_path).name
        return {
            "action": "caption",
            "message": "Captions generated successfully",
            "vtt_url": f"/media/{vtt_filename}",
            "text": text
        }

    # If the command is not recognized
    return {"action": "none", "message": "Coming soon! "}

# Run the app with Uvicorn (for development)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
