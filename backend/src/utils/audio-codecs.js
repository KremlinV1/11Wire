/**
 * Audio Codec Utilities
 * Provides audio conversion utilities for the audio bridge service
 * including μ-law and A-law encoding/decoding
 */

const logger = require('./logger');

/**
 * ULawDecoder class for converting μ-law encoded audio to PCM
 */
class ULawDecoder {
  /**
   * Initialize the μ-law decoder
   * @param {Object} sourceFormat - The source audio format
   */
  constructor(sourceFormat) {
    this.sourceFormat = sourceFormat;
    this.bitDepth = sourceFormat.bitDepth || 8;
    this.sampleRate = sourceFormat.sampleRate || 8000;
    this.channels = sourceFormat.channels || 1;
    
    // Initialize μ-law to linear PCM lookup table (for faster conversion)
    this.ulawToLinear = new Int16Array(256);
    this._initUlawTable();
    
    logger.debug(`ULawDecoder initialized: ${this.sampleRate}Hz, ${this.channels} channels`);
  }
  
  /**
   * Initialize μ-law to linear PCM lookup table
   * μ-law is an audio compression algorithm used in telecommunications
   * This creates a lookup table for faster conversion
   */
  _initUlawTable() {
    const BIAS = 33;
    const CLIP = 32635;
    
    for (let i = 0; i < 256; i++) {
      const ulaw = ~i;
      let t = ((ulaw & 0x0F) << 3) + 0x84;
      t <<= ((ulaw & 0x70) >> 4);
      
      let sample = t - BIAS;
      if (ulaw & 0x80) {
        sample = -sample;
      }
      
      this.ulawToLinear[i] = sample;
    }
    
    logger.debug('ULawDecoder lookup table initialized');
  }
  
  /**
   * Decode μ-law encoded audio buffer to linear PCM
   * @param {Buffer} buffer - μ-law encoded audio buffer
   * @returns {Buffer} - PCM decoded audio buffer
   */
  decode(buffer) {
    if (!buffer || buffer.length === 0) {
      return Buffer.alloc(0);
    }
    
    // Create output buffer (2 bytes per sample for 16-bit PCM)
    const outputBuffer = Buffer.alloc(buffer.length * 2);
    
    // Convert each μ-law byte to 16-bit PCM sample
    for (let i = 0; i < buffer.length; i++) {
      const pcmSample = this.ulawToLinear[buffer[i]];
      outputBuffer.writeInt16LE(pcmSample, i * 2);
    }
    
    return outputBuffer;
  }
}

/**
 * ALawDecoder class for converting A-law encoded audio to PCM
 */
class ALawDecoder {
  /**
   * Initialize the A-law decoder
   * @param {Object} sourceFormat - The source audio format
   */
  constructor(sourceFormat) {
    this.sourceFormat = sourceFormat;
    this.bitDepth = sourceFormat.bitDepth || 8;
    this.sampleRate = sourceFormat.sampleRate || 8000;
    this.channels = sourceFormat.channels || 1;
    
    // Initialize A-law to linear PCM lookup table (for faster conversion)
    this.alawToLinear = new Int16Array(256);
    this._initAlawTable();
    
    logger.debug(`ALawDecoder initialized: ${this.sampleRate}Hz, ${this.channels} channels`);
  }
  
  /**
   * Initialize A-law to linear PCM lookup table
   * A-law is an audio compression algorithm similar to μ-law
   * This creates a lookup table for faster conversion
   */
  _initAlawTable() {
    const ALAW_MAX = 0x7fff;
    
    for (let i = 0; i < 256; i++) {
      let input = i ^ 0x55;
      let mantissa = (input & 0x0f) << 4;
      let segment = (input & 0x70) >> 4;
      let value = mantissa + 8;
      
      if (segment > 0) {
        value += 0x100;
      }
      
      if (segment > 1) {
        value <<= (segment - 1);
      }
      
      this.alawToLinear[i] = input > 127 ? -value : value;
    }
    
    logger.debug('ALawDecoder lookup table initialized');
  }
  
  /**
   * Decode A-law encoded audio buffer to linear PCM
   * @param {Buffer} buffer - A-law encoded audio buffer
   * @returns {Buffer} - PCM decoded audio buffer
   */
  decode(buffer) {
    if (!buffer || buffer.length === 0) {
      return Buffer.alloc(0);
    }
    
    // Create output buffer (2 bytes per sample for 16-bit PCM)
    const outputBuffer = Buffer.alloc(buffer.length * 2);
    
    // Convert each A-law byte to 16-bit PCM sample
    for (let i = 0; i < buffer.length; i++) {
      const pcmSample = this.alawToLinear[buffer[i]];
      outputBuffer.writeInt16LE(pcmSample, i * 2);
    }
    
    return outputBuffer;
  }
}

/**
 * Decode μ-law encoded audio to PCM (standalone function)
 * @param {Buffer} buffer - μ-law encoded audio buffer
 * @returns {Buffer} - PCM decoded audio buffer
 */
function decodeULaw(buffer) {
  const decoder = new ULawDecoder({ sampleRate: 8000, channels: 1, bitDepth: 8 });
  return decoder.decode(buffer);
}

/**
 * Decode A-law encoded audio to PCM (standalone function)
 * @param {Buffer} buffer - A-law encoded audio buffer
 * @returns {Buffer} - PCM decoded audio buffer
 */
function decodeALaw(buffer) {
  const decoder = new ALawDecoder({ sampleRate: 8000, channels: 1, bitDepth: 8 });
  return decoder.decode(buffer);
}

module.exports = {
  ULawDecoder,
  ALawDecoder,
  decodeULaw,
  decodeALaw
};
