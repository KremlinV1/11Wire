/**
 * Answering Machine Detection (AMD) Controller
 * Endpoints for managing AMD features
 */

const amdService = require('../services/amd.service');
const signalwireService = require('../services/signalwire.service');
const logger = require('../utils/logger');

/**
 * Enable AMD for an existing call
 */
exports.enableAmdForCall = async (req, res) => {
  try {
    const { callSid } = req.params;
    const amdOptions = req.body;
    
    const result = await amdService.enableAmdForCall(callSid, amdOptions);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error enabling AMD for call: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to enable AMD for call'
    });
  }
};

/**
 * Process AMD result from a webhook
 */
exports.processAmdResult = async (req, res) => {
  try {
    const callData = req.body;
    
    const result = amdService.processAmdResult(callData);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error processing AMD result: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process AMD result'
    });
  }
};

/**
 * Generate AMD TwiML for a call
 */
exports.generateAmdTwiML = async (req, res) => {
  try {
    const { 
      audioUrl, 
      machineAudioUrl, 
      actionUrl 
    } = req.body;
    
    // Validate required parameters
    if (!audioUrl || !machineAudioUrl || !actionUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const amdOptions = req.body.amdOptions || {};
    
    const twiml = amdService.generateAmdTwiML(
      audioUrl,
      machineAudioUrl,
      actionUrl,
      amdOptions
    );
    
    // Return TwiML as XML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error generating AMD TwiML: ${error.message}`);
    
    // Generate basic TwiML in case of error
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
};

/**
 * Generate TwiML for leaving a message on answering machine
 */
exports.generateLeaveMessageTwiML = async (req, res) => {
  try {
    const { messageUrl, actionUrl } = req.body;
    
    // Validate required parameters
    if (!messageUrl || !actionUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const twiml = amdService.generateLeaveMessageTwiML(messageUrl, actionUrl);
    
    // Return TwiML as XML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error generating leave message TwiML: ${error.message}`);
    
    // Generate basic TwiML in case of error
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
};

/**
 * Generate TwiML for waiting for beep then leaving a message
 */
exports.generateWaitForBeepTwiML = async (req, res) => {
  try {
    const { messageUrl, actionUrl, waitSeconds } = req.body;
    
    // Validate required parameters
    if (!messageUrl || !actionUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    const twiml = amdService.generateWaitForBeepTwiML(
      messageUrl, 
      actionUrl, 
      waitSeconds || 2
    );
    
    // Return TwiML as XML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error generating wait for beep TwiML: ${error.message}`);
    
    // Generate basic TwiML in case of error
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
};

/**
 * Handle AMD webhook for automatic handling
 */
exports.handleAmdWebhook = async (req, res) => {
  try {
    const callData = req.body;
    const { CallSid, AnsweredBy } = callData;
    
    if (!CallSid || !AnsweredBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // Process AMD result
    const amdResult = amdService.processAmdResult(callData);
    
    // Get hostname for webhook URLs
    const hostname = process.env.PUBLIC_HOSTNAME || `http://localhost:${process.env.PORT || 3000}`;
    
    // Generate appropriate TwiML based on AMD result
    let twiml;
    
    if (amdResult.isMachine) {
      // It's a machine, leave a message
      const messageUrl = `${hostname}/api/media/answering-machine-message.mp3`;
      const actionUrl = `${hostname}/api/call/webhook/status`;
      
      if (amdResult.nextStep === 'wait_for_beep_then_message') {
        twiml = amdService.generateWaitForBeepTwiML(messageUrl, actionUrl);
      } else {
        twiml = amdService.generateLeaveMessageTwiML(messageUrl, actionUrl);
      }
    } else {
      // It's a human or unknown, continue with normal call flow
      const audioUrl = `${hostname}/api/media/human-greeting.mp3`;
      const responseWebhook = `${hostname}/api/call/webhook/gather/${CallSid}`;
      
      // Generate normal call TwiML
      twiml = signalwireService.generateCallTwiML(audioUrl, responseWebhook);
    }
    
    // Return TwiML as XML
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error handling AMD webhook: ${error.message}`);
    
    // Generate basic TwiML in case of error
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
        <Hangup />
      </Response>
    `);
  }
};
