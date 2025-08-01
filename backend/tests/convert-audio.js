/**
 * Convert raw audio file to WAV format for ElevenLabs API compatibility
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Set file paths
const RAW_AUDIO_FILE = path.join(__dirname, 'fixtures', 'test-audio-8khz.raw');
const WAV_AUDIO_FILE = path.join(__dirname, 'fixtures', 'test-audio-8khz.wav');

// Use ffmpeg to convert raw audio to WAV format
// Assuming 8kHz, mono, 16-bit PCM raw audio
console.log(`Converting ${RAW_AUDIO_FILE} to ${WAV_AUDIO_FILE}`);

const ffmpegCommand = `ffmpeg -f s16le -ar 8000 -ac 1 -i "${RAW_AUDIO_FILE}" "${WAV_AUDIO_FILE}" -y`;

exec(ffmpegCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error converting file: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.log(`ffmpeg output: ${stderr}`);
  }
  
  // Check if output file was created successfully
  if (fs.existsSync(WAV_AUDIO_FILE)) {
    const stats = fs.statSync(WAV_AUDIO_FILE);
    console.log(`✅ Conversion successful! Created ${WAV_AUDIO_FILE} (${stats.size} bytes)`);
  } else {
    console.error('❌ Conversion failed! Output file not found.');
  }
});
