/**
 * Call Handling Service
 * Core service that connects SignalWire telephony with ElevenLabs voice AI
 */

const db = require('../models');
const logger = require('../utils/logger');
const signalwireService = require('./signalwire.service');
const elevenlabsService = require('./elevenlabs.service');
const config = require('../config');

/**
 * Manage an active call session
 */
class CallSession {
  constructor(callSid, direction, phone, voiceAgentId) {
    this.callSid = callSid;
    this.direction = direction; // inbound or outbound
    this.phone = phone;
    this.voiceAgentId = voiceAgentId;
    this.conversationHistory = [];
    this.callStartTime = Date.now();
    this.callStatus = 'in-progress';
    this.audioChunks = [];
  }
  
  addToHistory(speaker, text) {
    this.conversationHistory.push({
      speaker,
      text,
      timestamp: Date.now()
    });
  }
  
  getTranscript() {
    return this.conversationHistory.map(item => (
      `${item.speaker}: ${item.text}`
    )).join('\n');
  }
  
  getCallDuration() {
    return Date.now() - this.callStartTime;
  }
}

// Store active call sessions (in-memory for now, consider Redis for production)
const activeCalls = new Map();

/**
 * Initialize a new outbound call
 * @param {string} to - Destination phone number
 * @param {string} from - Caller ID to use
 * @param {string} voiceAgentId - Voice agent ID to use
 * @param {string} scriptId - Script ID to use
 * @param {Object} campaignData - Associated campaign data
 * @param {string} [phoneNumberId] - Optional phone number ID (required for trial accounts)
 * @returns {Object} Call initialization response
 */
const initiateOutboundCall = async (to, from, voiceAgentId, scriptId, campaignData = {}, phoneNumberId = null) => {
  try {
    // Get hostname for webhook URLs
    const hostname = process.env.PUBLIC_HOSTNAME || `http://localhost:${config.port}`;
    const webhookBaseUrl = `${hostname}/api/call/webhook`;
    
    // Metadata to pass to SignalWire
    const metadata = {
      voiceAgentId,
      scriptId,
      campaignId: campaignData.id || null,
      callType: 'outbound'
    };
    
    // Make the call
    const call = await signalwireService.makeOutboundCall(
      to,
      from,
      webhookBaseUrl,
      metadata,
      phoneNumberId // Pass phone number ID for trial accounts
    );
    
    // Initialize call session
    const session = new CallSession(call.sid, 'outbound', to, voiceAgentId);
    activeCalls.set(call.sid, session);
    
    // Log call start
    logger.info(`Initiated outbound call to ${to} with SID: ${call.sid}`);
    
    return {
      callSid: call.sid,
      status: call.status,
      direction: 'outbound',
      to,
      from
    };
  } catch (error) {
    logger.error(`Error initiating outbound call: ${error.message}`);
    throw error;
  }
};

/**
 * Handle an inbound call
 * @param {Object} callData - Call data from SignalWire webhook
 * @returns {string} TwiML response
 */
const handleInboundCall = async (callData) => {
  try {
    // Extract call details
    const { CallSid, From, To } = callData;
    
    // For inbound calls, we'll need to determine which voice agent to use
    // This could be based on the dialed number or other routing rules
    const voiceAgentId = await determineVoiceAgent(To);
    
    // Initialize call session
    const session = new CallSession(CallSid, 'inbound', From, voiceAgentId);
    activeCalls.set(CallSid, session);
    
    // Get initial greeting from voice agent
    const greeting = await getAgentGreeting(voiceAgentId);
    
    // Add to conversation history
    session.addToHistory('agent', greeting);
    
    // Get hostname for webhook URLs
    const hostname = process.env.PUBLIC_HOSTNAME || `http://localhost:${config.port}`;
    const responseWebhook = `${hostname}/api/call/webhook/gather/${CallSid}`;
    
    // Generate audio for greeting
    const audioBuffer = await elevenlabsService.generateSpeech(greeting, voiceAgentId);
    
    // Save audio to file (temporary)
    const audioPath = `/tmp/${CallSid}-greeting.mp3`;
    await elevenlabsService.saveAudioToFile(audioBuffer, audioPath);
    
    // Public URL for the audio file (in production, use proper storage service)
    const audioUrl = `${hostname}/api/media/${CallSid}-greeting.mp3`;
    
    // Generate TwiML for call
    const twiml = signalwireService.generateCallTwiML(audioUrl, responseWebhook);
    
    // Log inbound call handling
    logger.info(`Handled inbound call from ${From} with SID: ${CallSid}`);
    
    return twiml;
  } catch (error) {
    logger.error(`Error handling inbound call: ${error.message}`);
    
    // Generate basic TwiML in case of error
    return `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `.trim();
  }
};

/**
 * Handle user speech/input from call
 * @param {Object} callData - Call data from SignalWire webhook
 * @returns {string} TwiML response
 */
const handleGather = async (callData) => {
  try {
    // Extract call details and user input
    const { CallSid, SpeechResult, Digits } = callData;
    
    // Get the active call session
    const session = activeCalls.get(CallSid);
    if (!session) {
      throw new Error(`No active session for call ${CallSid}`);
    }
    
    // Determine the user's input (speech or digits)
    let userInput = SpeechResult || '';
    if (Digits && !SpeechResult) {
      userInput = `Pressed ${Digits}`;
    }
    
    // Add to conversation history
    session.addToHistory('caller', userInput);
    
    // Get agent response based on conversation history and script
    const agentResponse = await generateAgentResponse(
      session.voiceAgentId, 
      userInput, 
      session.conversationHistory
    );
    
    // Add to conversation history
    session.addToHistory('agent', agentResponse);
    
    // Get hostname for webhook URLs
    const hostname = process.env.PUBLIC_HOSTNAME || `http://localhost:${config.port}`;
    const responseWebhook = `${hostname}/api/call/webhook/gather/${CallSid}`;
    
    // Generate audio for response
    const audioBuffer = await elevenlabsService.generateSpeech(agentResponse, session.voiceAgentId);
    
    // Save audio to file (temporary)
    const audioPath = `/tmp/${CallSid}-response-${Date.now()}.mp3`;
    await elevenlabsService.saveAudioToFile(audioBuffer, audioPath);
    
    // Public URL for the audio file (in production, use proper storage service)
    const audioUrl = `${hostname}/api/media/${CallSid}-response-${Date.now()}.mp3`;
    
    // Generate TwiML for continued conversation
    const twiml = signalwireService.generateCallTwiML(audioUrl, responseWebhook);
    
    // Log conversation turn
    logger.info(`Handled conversation turn for call ${CallSid}`);
    
    return twiml;
  } catch (error) {
    logger.error(`Error handling gather: ${error.message}`);
    
    // Generate basic TwiML in case of error
    return `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `.trim();
  }
};

/**
 * Handle real-time audio streaming for WebSocket integration
 * @param {Object} ws - WebSocket connection
 * @param {string} callSid - Call SID
 */
const handleAudioStream = async (ws, callSid) => {
  try {
    // Get the active call session
    const session = activeCalls.get(callSid);
    if (!session) {
      throw new Error(`No active session for call ${callSid}`);
    }
    
    // Set up message handling
    ws.on('message', (data) => {
      // Store audio chunks for processing
      session.audioChunks.push(data);
      
      // In a real implementation, process audio for real-time transcription
      // and generate responses using ElevenLabs
    });
    
    ws.on('close', () => {
      logger.info(`WebSocket closed for call ${callSid}`);
      
      // Process any remaining audio if needed
      if (session.audioChunks.length > 0) {
        // Process final audio
      }
    });
    
    // Keep the connection active
    const keepAlive = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(keepAlive);
      }
    }, 30000);
    
    logger.info(`Audio streaming established for call ${callSid}`);
  } catch (error) {
    logger.error(`Error handling audio stream: ${error.message}`);
    ws.close();
  }
};

/**
 * Handle call status updates
 * @param {Object} statusData - Call status data from webhook
 */
const handleCallStatus = async (statusData) => {
  try {
    const { CallSid, CallStatus, CallDuration, AnsweredBy } = statusData;
    
    // Get the active call session
    const session = activeCalls.get(CallSid);
    
    // Update call status
    if (session) {
      session.callStatus = CallStatus;
      
      // If call is completed, store the transcript and clean up
      if (CallStatus === 'completed') {
        // Store the transcript (implement database storage)
        const transcript = session.getTranscript();
        const duration = CallDuration || Math.floor(session.getCallDuration() / 1000);
        
        // Log call completion and transcript
        logger.info(`Call ${CallSid} completed. Duration: ${duration}s`);
        logger.debug(`Call transcript: ${transcript}`);
        
        // Save call log to database (to be implemented)
        // await saveCallLog(CallSid, session, transcript, duration);
        
        // Clean up session
        activeCalls.delete(CallSid);
      }
      
      // If answering machine was detected
      if (AnsweredBy === 'machine') {
        logger.info(`Answering machine detected for call ${CallSid}`);
        // Special handling for answering machines could be implemented here
      }
    }
  } catch (error) {
    logger.error(`Error handling call status: ${error.message}`);
  }
};

/**
 * Process outbound calls for a campaign
 * @param {string} campaignId - Campaign ID to process
 * @returns {Object} Processing results
 */
const processCampaignCalls = async (campaignId) => {
  try {
    // Get campaign data
    const campaign = await db.Campaign.findByPk(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // Check if campaign is active
    if (campaign.status !== 'active') {
      logger.info(`Campaign ${campaignId} is not active, no calls to process`);
      return { 
        processed: false,
        reason: 'Campaign not active'
      };
    }
    
    // In a real implementation, we would:
    // 1. Get contacts associated with the campaign
    // 2. Determine which contacts to call based on campaign settings
    // 3. Initiate calls to those contacts
    // 4. Update campaign stats
    
    // For now, just log that we would process calls
    logger.info(`Would process calls for campaign ${campaignId}`);
    
    // Mock implementation - update campaign stats
    const currentStats = campaign.stats || { total: 0, completed: 0, failed: 0, inProgress: 0 };
    const updatedStats = {
      ...currentStats,
      total: currentStats.total + 10,
      inProgress: currentStats.inProgress + 10
    };
    
    await campaign.update({ stats: updatedStats });
    
    return {
      processed: true,
      callsInitiated: 10,
      campaignId
    };
  } catch (error) {
    logger.error(`Error processing campaign calls: ${error.message}`);
    throw error;
  }
};

/**
 * Determine which voice agent to use for an inbound call
 * @param {string} toNumber - Number that was called
 * @returns {string} Voice agent ID to use
 */
const determineVoiceAgent = async (toNumber) => {
  // In a real implementation, lookup the voice agent based on the dialed number
  // For now, return a default
  return 'default-voice-agent';
};

/**
 * Get greeting message for a voice agent
 * @param {string} voiceAgentId - Voice agent ID
 * @returns {string} Greeting message
 */
const getAgentGreeting = async (voiceAgentId) => {
  // In a real implementation, fetch from database or API
  return 'Hello, thank you for calling. How can I assist you today?';
};

/**
 * Generate agent response based on conversation history
 * @param {string} voiceAgentId - Voice agent ID
 * @param {string} userInput - Latest user input
 * @param {Array} conversationHistory - Previous conversation turns
 * @returns {string} Agent response
 */
const generateAgentResponse = async (voiceAgentId, userInput, conversationHistory) => {
  try {
    // In a real implementation, use ElevenLabs conversational AI
    // For now, generate simple responses based on keywords
    const lowercaseInput = userInput.toLowerCase();
    
    if (lowercaseInput.includes('bye') || lowercaseInput.includes('goodbye')) {
      return 'Thank you for calling. Have a great day! Goodbye.';
    }
    
    if (lowercaseInput.includes('help')) {
      return 'I\'m here to help! What specifically do you need assistance with?';
    }
    
    if (lowercaseInput.includes('speak') || lowercaseInput.includes('manager')) {
      return 'I\'m sorry, but I\'m not able to transfer you to a manager at this time. How else can I assist you?';
    }
    
    // Default response
    return 'I understand. Can you tell me more about what you need?';
  } catch (error) {
    logger.error(`Error generating agent response: ${error.message}`);
    return 'I apologize, but I\'m having trouble with my systems. Could you repeat that?';
  }
};

module.exports = {
  initiateOutboundCall,
  handleInboundCall,
  handleGather,
  handleAudioStream,
  handleCallStatus,
  processCampaignCalls
};
