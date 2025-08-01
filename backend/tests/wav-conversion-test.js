/**
 * WAV Conversion Test Script
 * 
 * This script tests converting raw μ-law audio to WAV format
 * and submitting it to ElevenLabs for async STT.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const wav = require('wav');
const { Readable } = require('stream');
require('dotenv').config(); // Load environment variables directly

// Path to test audio file
const testAudioPath = path.join(__dirname, 'fixtures', 'test-audio-8khz.raw');

// ElevenLabs API settings
const API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.ELEVENLABS_WEBHOOK_URL;

console.log(`API Key available: ${API_KEY ? 'Yes' : 'No (undefined)'}`); 
console.log(`Webhook URL: ${WEBHOOK_URL || 'Not configured'}`);

/**
 * Convert μ-law audio to WAV format
 */
async function convertMuLawToWav(inputBuffer) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Converting ${inputBuffer.length} bytes of μ-law audio to WAV...`);
      
      // μ-law parameters
      const sampleRate = 8000; // Standard μ-law sample rate
      const channels = 1;      // Mono
      
      // Create a WAV writer with proper headers
      const writer = new wav.Writer({
        sampleRate: sampleRate,
        channels: channels,
        bitDepth: 16 // Convert to 16-bit PCM
      });
      
      // Create a readable stream from the μ-law buffer
      const readableStream = new Readable();
      readableStream.push(inputBuffer);
      readableStream.push(null); // End of stream
      
      // Collect chunks of WAV data
      const wavChunks = [];
      writer.on('data', (chunk) => {
        wavChunks.push(chunk);
      });
      
      writer.on('end', () => {
        // Combine chunks into a single buffer
        const wavBuffer = Buffer.concat(wavChunks);
        console.log(`Converted to WAV: ${wavBuffer.length} bytes`);
        
        // Write to a temporary file for inspection
        const tempWavPath = path.join(__dirname, 'fixtures', 'temp-converted.wav');
        fs.writeFileSync(tempWavPath, wavBuffer);
        console.log(`Saved WAV file for inspection: ${tempWavPath}`);
        
        resolve(wavBuffer);
      });
      
      writer.on('error', (err) => {
        reject(err);
      });
      
      // Pipe the stream through the WAV writer
      readableStream.pipe(writer);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Submit audio for async transcription
 */
async function submitSpeechToTextAsync(audioBuffer, options = {}) {
  try {
    console.log('Submitting audio for transcription...');
    
    if (!audioBuffer) {
      throw new Error('Audio buffer is required');
    }
    
    if (!WEBHOOK_URL) {
      throw new Error('Webhook URL is required for async STT');
    }
    
    if (!API_KEY) {
      throw new Error('ElevenLabs API key is required');
    }
    
    // Create form data for multipart request
    const formData = new FormData();
    
    // Add audio as WAV file
    formData.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });
    
    // Add required parameters
    formData.append('model_id', 'scribe_v1');
    formData.append('webhook_url', WEBHOOK_URL);
    
    // Add metadata
    const metadata = {
      test_id: `test_${Date.now()}`,
      request_time: new Date().toISOString()
    };
    formData.append('webhook_metadata', JSON.stringify(metadata));
    
    // Send request to ElevenLabs
    console.log('Sending request to ElevenLabs API...');
    const response = await axios.post(API_URL, formData, {
      headers: {
        'xi-api-key': API_KEY,
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Request successful! Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error submitting STT request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Run the test
 */
async function runTest() {
  try {
    console.log('Starting WAV conversion test...');
    
    // Read the test audio file
    const rawAudio = fs.readFileSync(testAudioPath);
    console.log(`Read ${rawAudio.length} bytes of raw audio`);
    
    // Convert to WAV format
    const wavAudio = await convertMuLawToWav(rawAudio);
    
    // Submit to ElevenLabs
    const result = await submitSpeechToTextAsync(wavAudio);
    
    console.log('Test complete! Request ID:', result.request_id);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
