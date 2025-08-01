/**
 * Answering Machine Detection (AMD) Service
 * Provides functionality to detect and handle answering machines during calls
 */

const logger = require('../utils/logger');
const signalwireService = require('./signalwire.service');
const config = require('../config');

// Default AMD configuration
const DEFAULT_AMD_CONFIG = {
  machineDetection: 'Enable',               // Enable, DetectMessageEnd, or DetectBeep
  machineDetectionTimeout: 30,              // Timeout in seconds
  machineDetectionSpeechThreshold: 2000,    // Threshold for human speech detection in ms
  machineDetectionSpeechEndThreshold: 1200, // Threshold for end of greeting in ms
  machineDetectionSilenceTimeout: 1500,     // Silence duration that indicates end of greeting in ms
};

/**
 * Get AMD configuration for a call
 * @param {Object} options - Configuration options
 * @returns {Object} AMD configuration
 */
const getAmdConfig = (options = {}) => {
  return {
    machineDetection: options.machineDetection || DEFAULT_AMD_CONFIG.machineDetection,
    machineDetectionTimeout: options.machineDetectionTimeout || DEFAULT_AMD_CONFIG.machineDetectionTimeout,
    machineDetectionSpeechThreshold: options.machineDetectionSpeechThreshold || DEFAULT_AMD_CONFIG.machineDetectionSpeechThreshold,
    machineDetectionSpeechEndThreshold: options.machineDetectionSpeechEndThreshold || DEFAULT_AMD_CONFIG.machineDetectionSpeechEndThreshold,
    machineDetectionSilenceTimeout: options.machineDetectionSilenceTimeout || DEFAULT_AMD_CONFIG.machineDetectionSilenceTimeout
  };
};

/**
 * Generate TwiML for a call with AMD enabled
 * @param {string} audioUrl - URL to play if human answers
 * @param {string} machineAudioUrl - URL to play if machine answers
 * @param {string} actionUrl - URL for next action
 * @param {Object} options - AMD configuration options
 * @returns {string} TwiML response
 */
const generateAmdTwiML = (audioUrl, machineAudioUrl, actionUrl, options = {}) => {
  const amdConfig = getAmdConfig(options);
  
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Dial
        answerOnBridge="true"
        action="${actionUrl}"
        machineDetection="${amdConfig.machineDetection}"
        machineDetectionTimeout="${amdConfig.machineDetectionTimeout}"
        machineDetectionSpeechThreshold="${amdConfig.machineDetectionSpeechThreshold}"
        machineDetectionSpeechEndThreshold="${amdConfig.machineDetectionSpeechEndThreshold}"
        machineDetectionSilenceTimeout="${amdConfig.machineDetectionSilenceTimeout}">
        <Number url="${actionUrl}"/>
      </Dial>
      <Play>${audioUrl}</Play>
    </Response>
  `.trim();
};

/**
 * Process AMD result from a webhook call
 * @param {Object} callData - Call data from SignalWire webhook
 * @returns {Object} AMD result with action recommendations
 */
const processAmdResult = (callData) => {
  const { AnsweredBy, CallSid, CallStatus, CallDuration } = callData;
  
  logger.info(`AMD result for call ${CallSid}: ${AnsweredBy || 'unknown'}`);
  
  // Determine if it's a machine or human
  const isMachine = AnsweredBy === 'machine_start' || 
                    AnsweredBy === 'machine_end_beep' || 
                    AnsweredBy === 'machine_end_silence' || 
                    AnsweredBy === 'machine_end_other';
                    
  const isHuman = AnsweredBy === 'human';
  const isUnknown = !AnsweredBy || AnsweredBy === 'unknown';
  
  // Different strategies based on what answered
  let action = 'proceed';
  let nextStep = 'continue_call';
  let messageType = 'human';
  
  if (isMachine) {
    // For answering machines, we might want to leave a message
    action = 'leave_message';
    nextStep = 'play_message_then_hangup';
    messageType = 'machine';
    
    // We might have different actions based on the specific machine detection
    if (AnsweredBy === 'machine_start') {
      // Machine greeting is still playing
      logger.debug(`Machine greeting detected and still playing for call ${CallSid}`);
    } else if (AnsweredBy === 'machine_end_beep') {
      // Machine greeting ended with a beep
      logger.debug(`Machine greeting ended with beep for call ${CallSid}`);
      nextStep = 'wait_for_beep_then_message';
    } else {
      // Machine greeting ended with silence or other
      logger.debug(`Machine greeting ended with ${AnsweredBy.replace('machine_end_', '')} for call ${CallSid}`);
    }
  } else if (isUnknown) {
    // Couldn't determine, proceed with caution
    action = 'proceed_cautiously';
    nextStep = 'check_for_response';
    messageType = 'unknown';
    
    logger.warn(`AMD could not determine if human or machine for call ${CallSid}`);
  }
  
  return {
    callSid: CallSid,
    answeredBy: AnsweredBy || 'unknown',
    callStatus: CallStatus,
    callDuration: CallDuration,
    isMachine,
    isHuman,
    isUnknown,
    action,
    nextStep,
    messageType
  };
};

/**
 * Handle a call based on AMD result
 * @param {string} callSid - Call SID
 * @param {string} answeredBy - What answered (human, machine_start, etc.)
 * @param {Function} humanCallback - Callback to execute if human answered
 * @param {Function} machineCallback - Callback to execute if machine answered
 * @returns {Object} Result of handling
 */
const handleAmdResult = async (callSid, answeredBy, humanCallback, machineCallback) => {
  try {
    const result = processAmdResult({ CallSid: callSid, AnsweredBy: answeredBy });
    
    if (result.isHuman && typeof humanCallback === 'function') {
      // Execute human callback
      await humanCallback(callSid, result);
      
      logger.info(`Executed human callback for call ${callSid}`);
      
      return {
        success: true,
        handled: 'human',
        callSid
      };
    }
    
    if (result.isMachine && typeof machineCallback === 'function') {
      // Execute machine callback
      await machineCallback(callSid, result);
      
      logger.info(`Executed machine callback for call ${callSid}`);
      
      return {
        success: true,
        handled: 'machine',
        callSid
      };
    }
    
    // Default handling
    return {
      success: true,
      handled: 'default',
      callSid,
      result
    };
  } catch (error) {
    logger.error(`Error handling AMD result for call ${callSid}: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      callSid
    };
  }
};

/**
 * Update call with AMD parameters
 * @param {string} callSid - Call SID
 * @param {Object} amdOptions - AMD configuration options
 * @returns {Object} Call update result
 */
const enableAmdForCall = async (callSid, amdOptions = {}) => {
  try {
    const amdConfig = getAmdConfig(amdOptions);
    
    // SignalWire call update with machine detection parameters
    const result = await signalwireService.updateCall(
      callSid, 
      {
        machineDetection: amdConfig.machineDetection,
        machineDetectionTimeout: amdConfig.machineDetectionTimeout,
        machineDetectionSpeechThreshold: amdConfig.machineDetectionSpeechThreshold,
        machineDetectionSpeechEndThreshold: amdConfig.machineDetectionSpeechEndThreshold,
        machineDetectionSilenceTimeout: amdConfig.machineDetectionSilenceTimeout
      }
    );
    
    logger.info(`Enabled AMD for call ${callSid}`);
    
    return {
      success: true,
      callSid,
      config: amdConfig
    };
  } catch (error) {
    logger.error(`Error enabling AMD for call ${callSid}: ${error.message}`);
    
    return {
      success: false,
      callSid,
      error: error.message
    };
  }
};

/**
 * Generate TwiML to leave a message on an answering machine
 * @param {string} messageUrl - URL of message audio to play
 * @param {string} actionUrl - URL for next action after message completes
 * @returns {string} TwiML response
 */
const generateLeaveMessageTwiML = (messageUrl, actionUrl) => {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Play>${messageUrl}</Play>
      <Redirect method="POST">${actionUrl}</Redirect>
    </Response>
  `.trim();
};

/**
 * Generate TwiML to wait for beep then leave message
 * @param {string} messageUrl - URL of message audio to play
 * @param {string} actionUrl - URL for next action after message completes
 * @param {number} waitSeconds - Seconds to wait for beep
 * @returns {string} TwiML response
 */
const generateWaitForBeepTwiML = (messageUrl, actionUrl, waitSeconds = 2) => {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Pause length="${waitSeconds}"/>
      <Play>${messageUrl}</Play>
      <Redirect method="POST">${actionUrl}</Redirect>
    </Response>
  `.trim();
};

module.exports = {
  getAmdConfig,
  generateAmdTwiML,
  processAmdResult,
  handleAmdResult,
  enableAmdForCall,
  generateLeaveMessageTwiML,
  generateWaitForBeepTwiML
};
