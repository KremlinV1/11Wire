/**
 * SignalWire Service
 * Handles all telephony operations using SignalWire Realtime API
 */

// Import the Voice client from the Realtime API
const { Voice } = require('@signalwire/realtime-api');
const config = require('../config');
const logger = require('../utils/logger');

// Environment check for mock mode
const isMockMode = process.env.TEST_MOCK_MODE === 'true';

// Initialize SignalWire Voice client with credentials (if not in mock mode)
let voiceClient;

if (!isMockMode) {
  try {
    // SignalWire Realtime API client for voice calls
    voiceClient = new Voice.Client({
      project: config.signalWire.projectId,
      token: config.signalWire.apiToken, // Using apiToken from config
      contexts: ['office'], // Default context for call routing
      host: config.signalWire.spaceUrl // Adding space URL for proper routing
    });
    logger.info('SignalWire Realtime Voice client initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize SignalWire Voice client: ${error.message}`);
  }
} else {
  logger.info('SignalWire service running in MOCK MODE');
}

/**
 * Make an outbound call
 * @param {string} to - Destination phone number
 * @param {string} from - Caller ID number
 * @param {string} webhookUrl - URL for call events and media streaming
 * @param {Object} metadata - Additional call metadata
 * @returns {Object} Call response
 */
/**
 * Format phone number to E.164 format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-numeric characters except the leading plus sign
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure it starts with a +
  if (!formatted.startsWith('+')) {
    // If it doesn't have a plus but starts with a 1 (US/Canada), add the plus
    if (formatted.startsWith('1')) {
      formatted = '+' + formatted;
    } else {
      // For other cases, assume US and add +1
      formatted = '+1' + formatted;
    }
  }
  
  return formatted;
};

/**
 * Make an outbound call
 * @param {string} to - Destination phone number
 * @param {string} from - Caller ID number
 * @param {string} webhookUrl - URL for call events and media streaming
 * @param {Object} metadata - Additional call metadata
 * @param {string} [phoneNumberId] - Optional phone number ID for trial accounts
 * @returns {Object} Call response
 */
const makeOutboundCall = async (to, from, webhookUrl, metadata = {}, phoneNumberId = null) => {
  try {
    // Ensure phone numbers are formatted correctly
    const formattedTo = formatPhoneNumber(to);
    const formattedFrom = formatPhoneNumber(from);
    
    logger.info(`Initiating outbound call to ${formattedTo} from ${formattedFrom}`);
    
    // Use phoneNumberId from environment if available and not provided
    const usePhoneNumberId = phoneNumberId || process.env.TEST_PHONE_NUMBER_ID;
    if (usePhoneNumberId) {
      logger.info(`Using phone number ID: ${usePhoneNumberId}`);
    }
    
    // Create mock response in test mode
    if (isMockMode) {
      const mockCallSid = `MC${Date.now()}`;
      logger.info(`[MOCK] Call initiated with SID: ${mockCallSid}`);
      
      return {
        id: mockCallSid,
        status: 'queued',
        to: formattedTo,
        from: formattedFrom,
        direction: 'outbound-api',
        metadata
      };
    }
    
    // Check if the client is initialized
    if (!voiceClient) {
      throw new Error('SignalWire Voice client not initialized. Check your credentials.');
    }
    
    // Trial account verification - verify destination is allowed
    const isTrial = true; // Assume trial account for safety
    if (isTrial && formattedTo !== process.env.TEST_TO_NUMBER) {
      throw new Error(`Trial account restriction: Can only call verified number ${process.env.TEST_TO_NUMBER}`);
    }
    
    // For trial accounts, we need to use specific approach
    const callOptions = {
      from: formattedFrom,
      to: formattedTo,
      timeout: 60, // Increase timeout to 60 seconds
    };
    
    // Add phoneNumberId if available (helps with trial accounts)
    if (usePhoneNumberId) {
      callOptions.fromPhoneNumberId = usePhoneNumberId;
    }
    
    // Add webhook URL if provided
    if (webhookUrl) {
      callOptions.media = {
        url: webhookUrl
      };
    }
    
    // Add event listeners
    callOptions.listen = {
      events: ['initiated', 'ringing', 'answered', 'completed']
    };
    
    // Add metadata if provided
    if (metadata && Object.keys(metadata).length > 0) {
      callOptions.metadata = metadata;
    }
    
    // Log the exact options being used for transparency
    logger.info(`SignalWire call options: ${JSON.stringify(callOptions, null, 2)}`);
    
    // First try with full options
    try {
      const call = await voiceClient.dialPhone(callOptions);
      
      logger.info(`Call initiated successfully with ID: ${call.id}`);
      return {
        id: call.id,
        sid: call.id, // For backwards compatibility
        status: call.state,
        to: formattedTo,
        from: formattedFrom,
        direction: 'outbound-api',
        metadata
      };
    } catch (innerError) {
      logger.error(`Initial call attempt failed: ${innerError.message}`);
      logger.error('Error details:', JSON.stringify(innerError));
      
      // If first attempt fails, try with minimal settings
      // Remove all optional parameters that might cause issues
      logger.info('Retrying with minimal call settings...');
      const minimalOptions = {
        from: formattedFrom,
        to: formattedTo
      };
      
      if (usePhoneNumberId) {
        minimalOptions.fromPhoneNumberId = usePhoneNumberId;
      }
      
      const call = await voiceClient.dialPhone(minimalOptions);
      
      logger.info(`Call initiated on second attempt with ID: ${call.id}`);
      return {
        id: call.id,
        sid: call.id,
        status: call.state,
        to: formattedTo,
        from: formattedFrom,
        direction: 'outbound-api'
      };
    }
  } catch (error) {
    logger.error(`Error making outbound call: ${error.message}`);
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    if (error.message_data) {
      logger.error(`Message data: ${JSON.stringify(error.message_data)}`);
    }
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`);
      logger.error('Response data:', JSON.stringify(error.response.data || {}));
    }
    throw error;
  }
};

/**
 * Get call details
 * @param {string} callSid - Call SID to fetch
 * @returns {Object} Call details
 */
const getCallDetails = async (callSid) => {
  try {
    // Return mock call details in test mode
    if (isMockMode || !voiceClient) {
      // If in mock mode or client not initialized, return mock data
      logger.info(`[MOCK/FALLBACK] Fetching call details for SID: ${callSid}`);
      return {
        sid: callSid,
        status: callSid.startsWith('MC') ? 'completed' : 'in-progress',
        to: '+15551234567',
        from: '+15559876543',
        direction: 'outbound-api',
        dateCreated: new Date(Date.now() - 60000).toISOString(),
        dateUpdated: new Date().toISOString(),
        duration: '60',
        answeredBy: Math.random() > 0.5 ? 'human' : 'machine'
      };
    }
    
    // Check again before using client (defensive programming)
    if (!voiceClient) {
      throw new Error('SignalWire Voice client not initialized. Check your credentials.');
    }
    
    const call = await voiceClient.calls(callSid).fetch();
    return call;
  } catch (error) {
    logger.error(`Error fetching call details: ${error.message}`);
    throw error;
  }
};

/**
 * Update call in progress
 * @param {string} callSid - Call SID to update
 * @param {Object} params - Parameters to update
 * @returns {Object} Updated call details
 */
const updateCall = async (callSid, params) => {
  try {
    // Return mock update in test mode
    if (isMockMode) {
      logger.info(`[MOCK] Updating call SID: ${callSid} with params:`, params);
      return {
        sid: callSid,
        status: params.status || 'in-progress',
        to: '+15551234567',
        from: '+15559876543',
        direction: 'outbound-api',
        dateCreated: new Date(Date.now() - 60000).toISOString(),
        dateUpdated: new Date().toISOString()
      };
    }
    
    const call = await voiceClient.calls(callSid).update(params);
    return call;
  } catch (error) {
    logger.error(`Error updating call: ${error.message}`);
    throw error;
  }
};

/**
 * End a call
 * @param {string} callSid - Call SID to end
 * @returns {Object} Call status
 */
const endCall = async (callSid) => {
  try {
    logger.info(`Ending call with SID: ${callSid}`);
    
    // Return mock result in test mode
    if (isMockMode) {
      logger.info(`[MOCK] Call ended with SID: ${callSid}`);
      return {
        sid: callSid,
        status: 'completed',
        to: '+15551234567',
        from: '+15559876543',
        direction: 'outbound-api',
        dateCreated: new Date(Date.now() - 120000).toISOString(),
        dateUpdated: new Date().toISOString(),
        duration: '120'
      };
    }
    
    const call = await voiceClient.calls(callSid).update({ 
      status: 'completed'
    });
    return call;
  } catch (error) {
    logger.error(`Error ending call: ${error.message}`);
    throw error;
  }
};

/**
 * Get recent calls
 * @param {Object} filters - Filters for the calls
 * @returns {Array} List of calls
 */
const getRecentCalls = async (filters = {}) => {
  try {
    // Create mock response in test mode
    if (isMockMode) {
      return {
        calls: [
          {
            id: `MC${Date.now() - 1000}`,
            sid: `MC${Date.now() - 1000}`, // For backwards compatibility
            status: 'completed',
            to: '+15551234567',
            from: '+15557654321',
            direction: 'outbound-api',
            duration: 45,
            dateCreated: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: `MC${Date.now() - 2000}`,
            sid: `MC${Date.now() - 2000}`, // For backwards compatibility
            status: 'no-answer',
            to: '+15551234568',
            from: '+15557654321',
            direction: 'outbound-api',
            duration: 0,
            dateCreated: new Date(Date.now() - 7200000).toISOString()
          }
        ]
      };
    }
    
    // Get actual calls from SignalWire Realtime API
    // Note: The Realtime API doesn't have a direct equivalent to the REST API's calls.list
    // In a real implementation, you would need to track calls in your own database
    // or use the SignalWire Dashboard API
    
    // For now, we'll return a mock response even in live mode
    // This should be replaced with actual implementation when available
    logger.warn('getRecentCalls: Real implementation with Realtime API not available, returning mock data');
    return {
      calls: [
        {
          id: `MC${Date.now() - 1000}`,
          sid: `MC${Date.now() - 1000}`,
          status: 'completed',
          to: '+15551234567',
          from: '+15557654321',
          direction: 'outbound-api',
          duration: 45,
          dateCreated: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    };
  } catch (error) {
    logger.error(`Error fetching recent calls: ${error.message}`);
    throw error;
  }
};

/**
 * Generate TwiML for call handling
 * @param {Object} options - TwiML options
 * @returns {string} TwiML XML string
 */
const generateTwiML = (options = {}) => {
  const {
    say,
    play,
    gather,
    record,
    redirect,
    dial,
    stream,
    hangup = true
  } = options;
  
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  
  if (say) {
    const { text, voice = 'alice', language = 'en-US', loop = 1 } = say;
    twiml += `<Say voice="${voice}" language="${language}" loop="${loop}">${text}</Say>`;
  }
  
  if (play) {
    const { url, loop = 1 } = play;
    twiml += `<Play loop="${loop}">${url}</Play>`;
  }
  
  if (gather) {
    const { numDigits = 1, timeout = 5, action, method = 'POST' } = gather;
    twiml += `<Gather numDigits="${numDigits}" timeout="${timeout}" action="${action}" method="${method}"></Gather>`;
  }
  
  if (record) {
    const { action, method = 'POST', timeout = 5, finishOnKey = '#', maxLength = 60 } = record;
    twiml += `<Record action="${action}" method="${method}" timeout="${timeout}" finishOnKey="${finishOnKey}" maxLength="${maxLength}" />`;
  }
  
  if (redirect) {
    const { url, method = 'POST' } = redirect;
    twiml += `<Redirect method="${method}">${url}</Redirect>`;
  }
  
  if (dial) {
    const { number, action, method = 'POST', timeout = 30, callerId } = dial;
    let dialTag = '<Dial';
    if (action) dialTag += ` action="${action}"`;
    if (method) dialTag += ` method="${method}"`;
    if (timeout) dialTag += ` timeout="${timeout}"`;
    if (callerId) dialTag += ` callerId="${callerId}"`;
    dialTag += `>${number}</Dial>`;
    twiml += dialTag;
  }
  
  if (stream) {
    const { url, track = 'both', customParameters = {} } = stream;
    
    // Start Stream tag with attributes
    let streamTag = '<Stream';
    if (url) streamTag += ` url="${url}"`;
    if (track) streamTag += ` track="${track}"`;
    
    // If we have custom parameters, add them as nested Parameter tags
    if (Object.keys(customParameters).length > 0) {
      streamTag += '>';
      
      // Add each custom parameter
      for (const [key, value] of Object.entries(customParameters)) {
        streamTag += `<Parameter name="${key}" value="${value}" />`;
      }
      
      streamTag += '</Stream>';
    } else {
      // No custom parameters, so self-close the tag
      streamTag += ' />';
    }
    
    twiml += streamTag;
    
    logger.debug(`Added Stream verb to TwiML: ${streamTag}`);
  }
  
  if (hangup) {
    twiml += '<Hangup />';
  }
  
  twiml += '</Response>';
  return twiml;
};

/**
 * Set up event listeners for a call
 * @param {Object} call - The call object from Realtime API
 * @param {Function} eventCallback - Callback for events
 */
const setupCallEventListeners = (call, eventCallback) => {
  if (!call || isMockMode) return;
  
  try {
    // Listen for call state changes
    call.on('stateChanged', (call) => {
      const event = {
        type: 'state',
        callId: call.id,
        state: call.state,
        timestamp: new Date().toISOString()
      };
      
      logger.info(`Call state changed: ${call.id} -> ${call.state}`);
      if (typeof eventCallback === 'function') {
        eventCallback(event);
      }
    });
    
    // Listen for machine detection events
    call.on('machineDetected', (result) => {
      const event = {
        type: 'machine_detection',
        callId: call.id,
        result: result.type, // human, machine, unknown
        timestamp: new Date().toISOString()
      };
      
      logger.info(`Machine detection result for ${call.id}: ${result.type}`);
      if (typeof eventCallback === 'function') {
        eventCallback(event);
      }
    });
    
    logger.info(`Event listeners set up for call ${call.id}`);
  } catch (error) {
    logger.error(`Error setting up call event listeners: ${error.message}`);
  }
};

/**
 * Start recording a call
 * @param {string} callSid - The SID of the call to record
 * @param {Object} options - Recording options
 * @returns {Object} Recording information
 */
const startRecording = async (callSid, options = {}) => {
  try {
    // Default recording options
    const recordingOptions = {
      track: options.track || 'both', // both, inbound, outbound
      format: options.format || 'mp3', // mp3, wav
      timeout: options.timeout || 0, // 0 means no timeout
      channels: options.channels || 1, // 1 for mono, 2 for dual/stereo
      ...options
    };
    
    logger.info(`Starting recording for call ${callSid} with options:`, recordingOptions);
    
    // Return mock data in test mode
    if (isMockMode) {
      const mockRecordingSid = `RE${Date.now()}`;
      logger.info(`[MOCK] Recording started with SID: ${mockRecordingSid}`);
      
      return {
        id: mockRecordingSid,
        callSid,
        status: 'in-progress',
        startTime: new Date().toISOString(),
        ...recordingOptions
      };
    }
    
    // Check if client is initialized
    if (!voiceClient) {
      throw new Error('SignalWire Voice client not initialized. Check your credentials.');
    }
    
    // Get the call object
    const call = await voiceClient.calls.get(callSid);
    if (!call) {
      throw new Error(`Call ${callSid} not found`);
    }
    
    // Start recording using the Realtime API
    const recording = await call.recordAudio(recordingOptions);
    
    logger.info(`Recording started for call ${callSid} with ID: ${recording.id}`);
    
    return {
      id: recording.id,
      callSid,
      status: 'in-progress',
      startTime: new Date().toISOString(),
      format: recordingOptions.format,
      channels: recordingOptions.channels
    };
  } catch (error) {
    logger.error(`Error starting recording for call ${callSid}: ${error.message}`);
    throw error;
  }
};

/**
 * Stop recording a call
 * @param {string} callSid - The SID of the call to stop recording
 * @returns {Object} Recording status
 */
const stopRecording = async (callSid) => {
  try {
    logger.info(`Stopping recording for call ${callSid}`);
    
    // Return mock data in test mode
    if (isMockMode) {
      logger.info(`[MOCK] Recording stopped for call ${callSid}`);
      
      return {
        callSid,
        status: 'completed',
        endTime: new Date().toISOString(),
        url: `https://api.signalwire.com/recordings/mock-${callSid}.mp3`
      };
    }
    
    // Check if client is initialized
    if (!voiceClient) {
      throw new Error('SignalWire Voice client not initialized. Check your credentials.');
    }
    
    // Get the call object
    const call = await voiceClient.calls.get(callSid);
    if (!call) {
      throw new Error(`Call ${callSid} not found`);
    }
    
    // Stop any active recordings
    await call.stopAudioRecording();
    
    logger.info(`Recording stopped for call ${callSid}`);
    
    return {
      callSid,
      status: 'completed',
      endTime: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error stopping recording for call ${callSid}: ${error.message}`);
    throw error;
  }
};

/**
 * Get recording details
 * @param {string} recordingSid - Recording SID to fetch
 * @returns {Object} Recording details
 */
const getRecordingDetails = async (recordingSid) => {
  try {
    logger.info(`Getting recording details for ${recordingSid}`);
    
    // Return mock data in test mode
    if (isMockMode) {
      logger.info(`[MOCK] Getting recording details for ${recordingSid}`);
      
      return {
        id: recordingSid,
        status: 'completed',
        duration: 45.2,
        channels: 1,
        format: 'mp3',
        url: `https://api.signalwire.com/recordings/mock-${recordingSid}.mp3`,
        size: 1024 * 1024, // 1MB in bytes
        dateCreated: new Date(Date.now() - 3600000).toISOString()
      };
    }
    
    // In a real implementation, you would use the SignalWire REST API to fetch recording details
    // Since the Realtime API doesn't provide direct access to recording details after creation
    
    // For now, return a mock response
    // This should be replaced with actual implementation when available
    logger.warn('getRecordingDetails: Real implementation not available, returning mock data');
    return {
      id: recordingSid,
      status: 'completed',
      duration: 45.2,
      channels: 1,
      format: 'mp3',
      url: `https://api.signalwire.com/recordings/mock-${recordingSid}.mp3`,
      size: 1024 * 1024 // 1MB in bytes
    };
  } catch (error) {
    logger.error(`Error getting recording details: ${error.message}`);
    throw error;
  }
};

/**
 * Transfer a call to another number or SIP endpoint
 * @param {string} callSid - The SID of the call to transfer
 * @param {string} targetEndpoint - The phone number or SIP endpoint to transfer to
 * @param {Object} options - Additional transfer options
 * @returns {Promise<Object>} Transfer result
 */
const transferCall = async (callSid, targetEndpoint, options = {}) => {
  try {
    logger.info(`Transferring call ${callSid} to ${targetEndpoint}`);
    
    // Return mock data in test mode
    if (isMockMode) {
      logger.info(`[MOCK] Transferring call ${callSid} to ${targetEndpoint}`);
      
      return {
        success: true,
        callSid,
        transferTarget: targetEndpoint,
        transferType: options.transferType || 'cold',
        status: 'initiated'
      };
    }
    
    // Check if client is initialized
    if (!voiceClient) {
      throw new Error('SignalWire Voice client not initialized. Check your credentials.');
    }
    
    // Get the call object
    const call = await voiceClient.calls.get(callSid);
    if (!call) {
      throw new Error(`Call ${callSid} not found`);
    }
    
    // Determine if this is a phone number or SIP endpoint
    const isSipEndpoint = targetEndpoint.toLowerCase().startsWith('sip:');
    
    // Build the device plan based on endpoint type
    const { Voice } = require('@signalwire/realtime-api');
    let devicePlan;
    
    if (isSipEndpoint) {
      // SIP endpoint transfer
      devicePlan = new Voice.DeviceBuilder().add(
        Voice.DeviceBuilder.Sip({
          from: options.fromSipUri || `sip:agent@${config.signalWire.spaceUrl}`,
          to: targetEndpoint,
          timeout: options.timeout || 30
        })
      );
    } else {
      // Phone number transfer
      const formattedTarget = formatPhoneNumber(targetEndpoint);
      devicePlan = new Voice.DeviceBuilder().add(
        Voice.DeviceBuilder.Phone({
          to: formattedTarget,
          from: options.fromNumber || call.from,
          timeout: options.timeout || 30
        })
      );
    }
    
    // Create ringback if this is a warm transfer
    let ringback = null;
    if (options.transferType === 'warm') {
      ringback = new Voice.Playlist().add(
        Voice.Playlist.Ringtone({
          name: "us",
        })
      );
    }
    
    // Connect the call to the target endpoint
    const peer = await call.connect({
      devices: devicePlan,
      ringback: ringback
    });
    
    // For warm transfers, we can play an announcement to the agent
    if (options.transferType === 'warm' && options.announcement) {
      await peer.playTTS({
        text: options.announcement
      });
    }
    
    logger.info(`Call ${callSid} successfully transferred to ${targetEndpoint}`);
    
    return {
      success: true,
      callSid,
      peerId: peer.id,
      transferTarget: targetEndpoint,
      transferType: options.transferType || 'cold',
      status: 'connected'
    };
  } catch (error) {
    logger.error(`Error transferring call ${callSid}: ${error.message}`);
    throw error;
  }
};

/**
 * Generate TwiML for call transfer
 * @param {string} targetEndpoint - The phone number or SIP endpoint to transfer to
 * @param {Object} options - Additional transfer options
 * @returns {string} TwiML XML string
 */
const generateTransferTwiML = (targetEndpoint, options = {}) => {
  try {
    logger.info(`Generating transfer TwiML to ${targetEndpoint}`);
    
    // Create basic TwiML for transfer
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    // Add optional announcement for warm transfers
    if (options.transferType === 'warm' && options.announcement) {
      twiml += `<Say>${options.announcement}</Say>`;
    }
    
    // Add dial verb with proper attributes
    twiml += `<Dial callerId="${options.callerId || '{{From}}'}"${options.timeout ? ` timeout="${options.timeout}"` : ''}${options.action ? ` action="${options.action}"` : ''}>`;
    
    // Add target based on type
    if (targetEndpoint.toLowerCase().startsWith('sip:')) {
      // SIP endpoint
      twiml += `<Sip>${targetEndpoint}</Sip>`;
    } else {
      // Phone number
      twiml += formatPhoneNumber(targetEndpoint);
    }
    
    // Close dial and response
    twiml += '</Dial></Response>';
    
    return twiml;
  } catch (error) {
    logger.error(`Error generating transfer TwiML: ${error.message}`);
    throw error;
  }
};

module.exports = {
  makeOutboundCall,
  getCallDetails,
  updateCall,
  endCall,
  getRecentCalls,
  generateTwiML,
  setupCallEventListeners,
  startRecording,
  stopRecording,
  getRecordingDetails,
  transferCall,
  generateTransferTwiML
};
