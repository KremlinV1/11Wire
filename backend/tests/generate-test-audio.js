/**
 * Test Audio Generator
 * 
 * This script generates a test audio file in μ-law 8kHz format
 * for use with the audio bridge integration test.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create fixtures directory if it doesn't exist
const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Output file paths
const outputRawFile = path.join(fixturesDir, 'test-audio-8khz.raw');
const outputWavFile = path.join(fixturesDir, 'test-audio-8khz.wav');
const outputTextFile = path.join(fixturesDir, 'test-audio-transcript.txt');

// Test phrase to convert to speech
const testPhrase = "Hello, this is a test for the audio bridge between SignalWire and ElevenLabs.";

// Save the test phrase to a text file
fs.writeFileSync(outputTextFile, testPhrase, 'utf8');
console.log(`✅ Created test transcript file: ${outputTextFile}`);

// Check if sox is installed
exec('which sox', (error) => {
  if (error) {
    console.error('❌ Error: SoX is not installed. Please install it using:');
    console.error('   brew install sox (macOS)');
    console.error('   apt-get install sox (Ubuntu/Debian)');
    process.exit(1);
  } else {
    console.log('✅ SoX is installed, generating audio file...');
    generateAudio();
  }
});

/**
 * Generate test audio file using SoX
 */
function generateAudio() {
  // Generate WAV file using SoX text2wave
  exec(`say -v Alex "${testPhrase}" -o ${outputWavFile}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error generating WAV file: ${error.message}`);
      
      // Try alternative method with SoX directly if text2wave fails
      generateWithSox();
      return;
    }
    
    console.log(`✅ Created WAV file: ${outputWavFile}`);
    
    // Convert WAV to μ-law 8kHz raw file
    exec(`sox ${outputWavFile} -t raw -r 8000 -c 1 -e mu-law ${outputRawFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error converting to μ-law: ${error.message}`);
        return;
      }
      
      console.log(`✅ Created μ-law 8kHz raw file: ${outputRawFile}`);
      console.log('\n🎉 Test audio files generated successfully!');
      console.log(`\nYou can now run the audio bridge test with:`);
      console.log(`node tests/audio-bridge-test.js`);
    });
  });
}

/**
 * Alternative method to generate audio with SoX directly
 */
function generateWithSox() {
  // Generate a sine wave as test audio
  exec(`sox -n -r 8000 -c 1 ${outputWavFile} synth 3 sine 440 sine 880 sine 1320`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error generating audio with SoX: ${error.message}`);
      console.error('Please create a test audio file manually');
      return;
    }
    
    console.log(`✅ Created WAV file with SoX: ${outputWavFile}`);
    
    // Convert WAV to μ-law 8kHz raw file
    exec(`sox ${outputWavFile} -t raw -r 8000 -c 1 -e mu-law ${outputRawFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error converting to μ-law: ${error.message}`);
        return;
      }
      
      console.log(`✅ Created μ-law 8kHz raw file: ${outputRawFile}`);
      console.log('\n🎉 Test audio files generated successfully!');
      console.log(`\nYou can now run the audio bridge test with:`);
      console.log(`node tests/audio-bridge-test.js`);
    });
  });
}
