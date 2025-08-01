/**
 * Services Index
 * Exports all service modules for easy import elsewhere in the application
 */

const amdService = require('./amd.service');
const answeringMachineDetectionService = require('./answering-machine-detection.service');
const audioBridgeService = require('./audio-bridge.service');
const callEventListenerService = require('./call-event-listener.service');
const callEventsService = require('./call-events.service');
const callHandlingService = require('./call-handling.service');
const callQueueService = require('./call-queue.service');
const callRecordingService = require('./call-recording.service');
const callSchedulerService = require('./call-scheduler.service');
const callTransferService = require('./call-transfer.service');
const campaignSchedulerService = require('./campaign-scheduler.service');
const campaignService = require('./campaign.service');
const elevenlabsService = require('./elevenlabs.service');
const mediaStreamService = require('./media-stream.service');
const queueSchedulerService = require('./queue-scheduler.service');
const signalwireService = require('./signalwire.service');
const storageService = require('./storage.service');
const websocketServerService = require('./websocket-server.service');

module.exports = {
  amdService,
  answeringMachineDetectionService,
  audioBridgeService,
  callEventListenerService,
  callEventsService,
  callHandlingService,
  callQueueService,
  callRecordingService,
  callSchedulerService,
  callTransferService,
  campaignSchedulerService,
  campaignService,
  elevenlabsService,
  mediaStreamService,
  queueSchedulerService,
  signalwireService,
  storageService,
  websocketServerService
};
