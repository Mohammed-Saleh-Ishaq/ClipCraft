export function generateVTT(transcript) {
  // transcript is a string from backend
  // split into sentences for demo purposes
  const sentences = transcript.split(". ").filter(Boolean);

  let vtt = "WEBVTT\n\n";
  sentences.forEach((s, i) => {
    const start = (i * 3).toFixed(2); // 3s per sentence
    const end = ((i + 1) * 3).toFixed(2);
    vtt += `${i + 1}\n`;
    vtt += `${formatTime(start)} --> ${formatTime(end)}\n`;
    vtt += `${s.trim()}\n\n`;
  });

  return vtt;
}

function formatTime(seconds) {
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  return `00:${m}:${s}.000`;
}
