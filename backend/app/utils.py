import os
import subprocess
import time
from pathlib import Path

# Define the base directory and media directory.
BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(exist_ok=True)

# Function to trim a video using ffmpeg
def run_ffmpeg_trim(input_path: str, start: float, duration: float, output_path: str):
    """Trim a video using ffmpeg."""
    cmd = [
        "ffmpeg",
        "-y",                # Overwrite output file without asking
        "-i", input_path,    # Input file
        "-ss", str(start),   # Start time (in seconds)
        "-t", str(duration), # Duration (in seconds)
        "-c", "copy",        # Copy codec (no re-encoding)
        output_path          # Output file path
    ]
    subprocess.check_call(cmd)

# Function to get the duration of a video using ffprobe
def get_duration(input_path: str) -> float:
    """Return video duration in seconds using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "error",                                       # Suppress unnecessary output
        "-show_entries", "format=duration",                   # Only show duration info
        "-of", "default=noprint_wrappers=1:nokey=1",         # Format output without extra wrapping
        input_path                                            # Input file path
    ]
    out = subprocess.check_output(cmd).decode().strip()
    return float(out)

#new fuction to clean up old videos files

def cleanup_old_media(media_dir: str | Path, max_age_hours: int = 24):
    """
    Delete files in media_dir older than max_age_hours.
    Call this function occasionally (e.g. after processing) to save disk space for MVP.
    """
    media_dir = Path(media_dir)
    if not media_dir.exists():
        return

    now = time.time()
    cutoff = now - max_age_hours * 3600  # Convert hours to seconds

    for p in media_dir.iterdir():
        try:
            # Ignore directories
            if not p.is_file():
                continue

            # Get the last modified time (mtime) of the file
            mtime = p.stat().st_mtime

            # If file's modification time is older than cutoff, delete it
            if mtime < cutoff:
                p.unlink()  # Deletes the file

        except Exception:
            # Ignore any errors during deletion for now
            pass
