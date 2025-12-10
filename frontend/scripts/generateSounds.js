/**
 * Sound generation script for Pacman game
 * Generates simple WAV files for game sound effects
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WAV file header generator
function createWavHeader(dataLength, sampleRate = 44100, numChannels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
  buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  
  return buffer;
}

// Generate a simple tone
function generateTone(frequency, duration, sampleRate = 44100, volume = 0.3) {
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(numSamples * 2); // 16-bit samples
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * 32767;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }
  
  return buffer;
}

// Generate a frequency sweep
function generateSweep(startFreq, endFreq, duration, sampleRate = 44100, volume = 0.3) {
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(numSamples * 2);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = t / duration;
    const frequency = startFreq + (endFreq - startFreq) * progress;
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * 32767;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }
  
  return buffer;
}

// Generate noise burst
function generateNoise(duration, sampleRate = 44100, volume = 0.2) {
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(numSamples * 2);
  
  for (let i = 0; i < numSamples; i++) {
    const sample = (Math.random() * 2 - 1) * volume * 32767;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }
  
  return buffer;
}

// Generate chomp sound (short beep)
function generateChomp() {
  const audioData = generateTone(400, 0.05, 44100, 0.2);
  const header = createWavHeader(audioData.length);
  return Buffer.concat([header, audioData]);
}

// Generate dot collection sound (higher pitch beep)
function generateDotCollect() {
  const audioData = generateTone(800, 0.08, 44100, 0.15);
  const header = createWavHeader(audioData.length);
  return Buffer.concat([header, audioData]);
}

// Generate power pellet sound (ascending tone)
function generatePowerPellet() {
  const audioData = generateSweep(200, 800, 0.3, 44100, 0.25);
  const header = createWavHeader(audioData.length);
  return Buffer.concat([header, audioData]);
}

// Generate ghost eaten sound (descending tone)
function generateGhostEaten() {
  const audioData = generateSweep(1000, 200, 0.4, 44100, 0.2);
  const header = createWavHeader(audioData.length);
  return Buffer.concat([header, audioData]);
}

// Generate death sound (descending sweep)
function generateDeath() {
  const audioData = generateSweep(800, 100, 1.0, 44100, 0.25);
  const header = createWavHeader(audioData.length);
  return Buffer.concat([header, audioData]);
}

// Generate siren sound (alternating tones)
function generateSiren() {
  const sampleRate = 44100;
  const duration = 2.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(numSamples * 2);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Alternate between two frequencies
    const frequency = Math.sin(t * 4) > 0 ? 400 : 300;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.15 * 32767;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }
  
  const header = createWavHeader(buffer.length);
  return Buffer.concat([header, buffer]);
}

// Main function to generate all sounds
function generateAllSounds() {
  const outputDir = path.join(__dirname, '..', 'public', 'assets', 'sounds');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Generating sound effects...');
  
  // Generate each sound
  const sounds = {
    'chomp.wav': generateChomp(),
    'dot.wav': generateDotCollect(),
    'power-pellet.wav': generatePowerPellet(),
    'eat-ghost.wav': generateGhostEaten(),
    'death.wav': generateDeath(),
    'siren.wav': generateSiren(),
  };
  
  // Write files
  for (const [filename, data] of Object.entries(sounds)) {
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, data);
    console.log(`✓ Generated ${filename}`);
  }
  
  console.log('All sound effects generated successfully!');
}

// Run the generator
generateAllSounds();
