/**
 * Inbound Call Controller
 * 
 * Handles incoming call routing using SignalWire XML/SWML
 */

const signalWireService = require('../services/signalwire.service');
const campaignService = require('../services/campaign.service');
const agentService = require('../services/agent.service');
const contactService = require('../services/contact.service');
const logger = require('../utils/logger');
const { validateSignature } = require('../middleware/signalwire-webhook');
const config = require('../config');

/**
 * Handle initial inbound call and provide routing instructions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleInboundCall = async (req, res) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;
    
    // Log the incoming call
    logger.info(`Incoming call received: ${CallSid} from ${From} to ${To}, status: ${CallStatus}`);
    
    // Look up if this caller exists in our contacts database
    const contact = await contactService.findContactByPhone(From);
    
    // Determine which IVR flow to use
    const flow = await determineCallFlow(To, contact);
    
    // Generate appropriate XML response based on the determined flow
    const xmlResponse = await generateCallFlowXml(flow, {
      callSid: CallSid,
      from: From,
      to: To,
      contact: contact
    });
    
    // Set XML content type and send response
    res.type('text/xml');
    res.send(xmlResponse);
  } catch (error) {
    logger.error(`Error handling inbound call: ${error.message}`);
    
    // Return a basic error response that will speak the error to the caller
    const errorXml = signalWireService.generateTwiML({
      say: `We're sorry, but there was an error processing your call. Please try again later.`
    });
    
    res.type('text/xml');
    res.send(errorXml);
  }
};

/**
 * Determine the appropriate call flow based on the dialed number and contact info
 * @param {string} dialedNumber - The number that was called
 * @param {Object} contact - Contact information if found
 * @returns {string} Flow identifier
 */
const determineCallFlow = async (dialedNumber, contact) => {
  try {
    // Check if this number is associated with a specific campaign
    const campaign = await campaignService.findCampaignByPhoneNumber(dialedNumber);
    
    if (campaign) {
      return {
        type: 'campaign',
        id: campaign.id,
        name: campaign.name,
        greeting: campaign.inboundGreeting || 'Thank you for calling our campaign line.'
      };
    }
    
    // Check if this is a return call from a previous outreach
    if (contact) {
      const recentCalls = await contactService.getRecentCallsForContact(contact.id, {
        limit: 1,
        direction: 'outbound',
        daysAgo: 7
      });
      
      if (recentCalls && recentCalls.length > 0) {
        const recentCall = recentCalls[0];
        
        return {
          type: 'return_call',
          campaignId: recentCall.campaignId,
          agentId: recentCall.agentId,
          greeting: 'Thank you for returning our call.'
        };
      }
    }
    
    // Default to main IVR
    return {
      type: 'main_ivr',
      greeting: 'Thank you for calling our main line.'
    };
  } catch (error) {
    logger.error(`Error determining call flow: ${error.message}`);
    return { type: 'error' };
  }
};

/**
 * Generate appropriate XML flow based on the determined route
 * @param {Object} flow - Flow information
 * @param {Object} callData - Call data including SID and caller info
 * @returns {string} XML response
 */
const generateCallFlowXml = async (flow, callData) => {
  const { callSid, from, to, contact } = callData;
  
  try {
    switch (flow.type) {
      case 'campaign':
        return generateCampaignFlow(flow, callData);
      
      case 'return_call':
        return generateReturnCallFlow(flow, callData);
      
      case 'main_ivr':
        return generateMainIvrFlow(flow, callData);
      
      case 'error':
      default:
        return signalWireService.generateTwiML({
          say: `We're sorry, but there was an error processing your call. Please try again later.`,
          hangup: true
        });
    }
  } catch (error) {
    logger.error(`Error generating call flow XML: ${error.message}`);
    
    return signalWireService.generateTwiML({
      say: `We're sorry, but there was an error processing your call. Please try again later.`,
      hangup: true
    });
  }
};

/**
 * Generate a campaign-specific XML flow
 * @param {Object} flow - Flow information
 * @param {Object} callData - Call data
 * @returns {string} XML response
 */
const generateCampaignFlow = (flow, callData) => {
  const { callSid, from, contact } = callData;
  const baseUrl = config.publicUrl || 'https://api.example.com';
  
  // Create greeting and options menu
  const options = {
    say: flow.greeting,
    gather: {
      numDigits: 1,
      timeout: 5,
      action: `${baseUrl}/api/calls/inbound/handle-campaign-input?campaignId=${flow.id}&callSid=${callSid}`,
      say: 'Press 1 to speak with an agent. Press 2 to leave a voicemail. Press 3 for more information.'
    }
  };
  
  // Add metadata to help with later processing
  if (contact) {
    options.callMetadata = {
      contactId: contact.id,
      contactName: contact.name,
      campaignId: flow.id
    };
  }
  
  return signalWireService.generateTwiML(options);
};

/**
 * Generate a return call XML flow
 * @param {Object} flow - Flow information
 * @param {Object} callData - Call data
 * @returns {string} XML response
 */
const generateReturnCallFlow = (flow, callData) => {
  const { callSid, contact } = callData;
  const baseUrl = config.publicUrl || 'https://api.example.com';
  
  // Try to connect with the original agent if available
  return signalWireService.generateTwiML({
    say: flow.greeting,
    say: `We'll connect you with your representative.`,
    dial: {
      action: `${baseUrl}/api/calls/inbound/handle-return-call?callSid=${callSid}&campaignId=${flow.campaignId}`,
      timeout: 20,
      // If agent ID is available, try to connect to them
      ...(flow.agentId ? {
        sip: `sip:agent-${flow.agentId}@${config.signalWire.spaceUrl}`
      } : {
        // Otherwise use a queue
        queue: `campaign-${flow.campaignId}`
      })
    },
    callMetadata: contact ? {
      contactId: contact.id,
      contactName: contact.name,
      campaignId: flow.campaignId,
      returnCall: true
    } : undefined
  });
};

/**
 * Generate the main IVR XML flow
 * @param {Object} flow - Flow information
 * @param {Object} callData - Call data
 * @returns {string} XML response
 */
const generateMainIvrFlow = (flow, callData) => {
  const { callSid } = callData;
  const baseUrl = config.publicUrl || 'https://api.example.com';
  
  return signalWireService.generateTwiML({
    say: flow.greeting,
    gather: {
      numDigits: 1,
      timeout: 5,
      action: `${baseUrl}/api/calls/inbound/handle-ivr-input?callSid=${callSid}`,
      say: 'Press 1 for sales. Press 2 for support. Press 3 for billing. Press 0 to speak with an operator.'
    }
  });
};

/**
 * Handle user input from the main IVR menu
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleIvrInput = async (req, res) => {
  try {
    const { CallSid, Digits } = req.body;
    const { callSid } = req.query;
    
    logger.info(`IVR input received: ${Digits} for call ${CallSid || callSid}`);
    
    let xmlResponse;
    
    // Process user input
    switch (Digits) {
      case '1': // Sales
        xmlResponse = signalWireService.generateTwiML({
          say: 'Connecting you to our sales team. Please wait while we connect your call.',
          dial: {
            queue: 'sales'
          }
        });
        break;
      
      case '2': // Support
        xmlResponse = signalWireService.generateTwiML({
          say: 'Connecting you to our support team. Please wait while we connect your call.',
          dial: {
            queue: 'support'
          }
        });
        break;
      
      case '3': // Billing
        xmlResponse = signalWireService.generateTwiML({
          say: 'Connecting you to our billing department. Please wait while we connect your call.',
          dial: {
            queue: 'billing'
          }
        });
        break;
      
      case '0': // Operator
        xmlResponse = signalWireService.generateTwiML({
          say: 'Connecting you to an operator. Please wait while we connect your call.',
          dial: {
            number: config.operatorPhoneNumber || '+18005551234'
          }
        });
        break;
      
      default:
        // Invalid or no input
        xmlResponse = signalWireService.generateTwiML({
          say: 'Sorry, I did not understand your selection.',
          redirect: `${config.publicUrl}/api/calls/inbound` // Start over
        });
        break;
    }
    
    res.type('text/xml');
    res.send(xmlResponse);
  } catch (error) {
    logger.error(`Error handling IVR input: ${error.message}`);
    
    const errorXml = signalWireService.generateTwiML({
      say: `We're sorry, but there was an error processing your selection. Please try again later.`,
      hangup: true
    });
    
    res.type('text/xml');
    res.send(errorXml);
  }
};

/**
 * Handle user input from a campaign-specific menu
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleCampaignInput = async (req, res) => {
  try {
    const { CallSid, Digits } = req.body;
    const { campaignId, callSid } = req.query;
    
    logger.info(`Campaign input received: ${Digits} for call ${CallSid || callSid} campaign ${campaignId}`);
    
    // Get campaign details
    const campaign = await campaignService.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    let xmlResponse;
    
    // Process user input
    switch (Digits) {
      case '1': // Speak with agent
        // Check if agents are available
        const agentsAvailable = await agentService.getAvailableAgentsCount(campaignId);
        
        if (agentsAvailable > 0) {
          xmlResponse = signalWireService.generateTwiML({
            say: 'Connecting you to the next available agent. Please wait while we connect your call.',
            dial: {
              queue: `campaign-${campaignId}`
            }
          });
        } else {
          // No agents available, offer voicemail
          xmlResponse = signalWireService.generateTwiML({
            say: 'We\'re sorry, but all of our agents are currently busy. Please leave a message after the tone.',
            record: {
              action: `${config.publicUrl}/api/calls/inbound/handle-voicemail?campaignId=${campaignId}`,
              transcribe: true,
              transcribeCallback: `${config.publicUrl}/api/calls/inbound/transcription?campaignId=${campaignId}`,
              maxLength: 120,
              playBeep: true
            }
          });
        }
        break;
      
      case '2': // Leave voicemail
        xmlResponse = signalWireService.generateTwiML({
          say: 'Please leave your message after the tone.',
          record: {
            action: `${config.publicUrl}/api/calls/inbound/handle-voicemail?campaignId=${campaignId}`,
            transcribe: true,
            transcribeCallback: `${config.publicUrl}/api/calls/inbound/transcription?campaignId=${campaignId}`,
            maxLength: 120,
            playBeep: true
          }
        });
        break;
      
      case '3': // More information
        xmlResponse = signalWireService.generateTwiML({
          say: campaign.description || 'Thank you for your interest in our campaign.',
          redirect: `${config.publicUrl}/api/calls/inbound?campaignId=${campaignId}` // Back to campaign menu
        });
        break;
      
      default:
        // Invalid or no input
        xmlResponse = signalWireService.generateTwiML({
          say: 'Sorry, I did not understand your selection.',
          redirect: `${config.publicUrl}/api/calls/inbound?campaignId=${campaignId}` // Back to campaign menu
        });
        break;
    }
    
    res.type('text/xml');
    res.send(xmlResponse);
  } catch (error) {
    logger.error(`Error handling campaign input: ${error.message}`);
    
    const errorXml = signalWireService.generateTwiML({
      say: `We're sorry, but there was an error processing your selection. Please try again later.`,
      hangup: true
    });
    
    res.type('text/xml');
    res.send(errorXml);
  }
};

/**
 * Handle voicemail recording
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleVoicemail = async (req, res) => {
  try {
    const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body;
    const { campaignId } = req.query;
    
    logger.info(`Voicemail received for call ${CallSid}, campaign ${campaignId}, recording ${RecordingSid}`);
    
    // Save voicemail metadata
    if (RecordingUrl && RecordingSid) {
      await saveVoicemailMetadata({
        callSid: CallSid,
        campaignId,
        recordingUrl: RecordingUrl,
        recordingSid: RecordingSid,
        duration: RecordingDuration
      });
    }
    
    // Thank the caller and end the call
    const xmlResponse = signalWireService.generateTwiML({
      say: 'Thank you for your message. We will get back to you as soon as possible.',
      hangup: true
    });
    
    res.type('text/xml');
    res.send(xmlResponse);
  } catch (error) {
    logger.error(`Error handling voicemail: ${error.message}`);
    
    const errorXml = signalWireService.generateTwiML({
      say: `We're sorry, but there was an error processing your voicemail. Please try again later.`,
      hangup: true
    });
    
    res.type('text/xml');
    res.send(errorXml);
  }
};

/**
 * Handle transcription callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleTranscription = async (req, res) => {
  try {
    const { CallSid, RecordingSid, TranscriptionText, TranscriptionStatus } = req.body;
    const { campaignId } = req.query;
    
    logger.info(`Transcription received for call ${CallSid}, recording ${RecordingSid}, status ${TranscriptionStatus}`);
    
    // Save transcription if available
    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      await saveTranscription({
        callSid: CallSid,
        campaignId,
        recordingSid: RecordingSid,
        transcription: TranscriptionText
      });
    }
    
    // No need for TwiML response for callbacks
    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Error handling transcription: ${error.message}`);
    res.status(500).send('Error');
  }
};

/**
 * Save voicemail metadata to the database
 * @param {Object} voicemailData - Voicemail metadata
 */
const saveVoicemailMetadata = async (voicemailData) => {
  try {
    const { callSid, campaignId, recordingUrl, recordingSid, duration } = voicemailData;
    
    // Get the call record
    let call = await signalWireService.getCallDetails(callSid);
    
    // Save to database
    // TODO: Implement actual database save logic
    logger.info(`Voicemail metadata saved for call ${callSid}`);
  } catch (error) {
    logger.error(`Error saving voicemail metadata: ${error.message}`);
    throw error;
  }
};

/**
 * Save transcription to the database
 * @param {Object} transcriptionData - Transcription data
 */
const saveTranscription = async (transcriptionData) => {
  try {
    const { callSid, campaignId, recordingSid, transcription } = transcriptionData;
    
    // Save to database
    // TODO: Implement actual database save logic
    logger.info(`Transcription saved for call ${callSid}`);
  } catch (error) {
    logger.error(`Error saving transcription: ${error.message}`);
    throw error;
  }
};

module.exports = {
  handleInboundCall,
  handleIvrInput,
  handleCampaignInput,
  handleVoicemail,
  handleTranscription
};
