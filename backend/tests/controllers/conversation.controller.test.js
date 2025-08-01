/**
 * Conversation Controller Unit Tests
 * Tests the functionality of the conversation controller
 */

const Sequelize = require('sequelize');

// Import the models and controller
const { Conversation, Campaign, CallRecording } = require('../../src/models');
const conversationController = require('../../src/controllers/conversation.controller');

describe('Conversation Controller Tests', () => {
  let req, res, statusStub, jsonStub;

  beforeEach(() => {
    // Setup request and response objects
    req = {
      params: {},
      query: {},
      body: {}
    };

    jsonStub = jest.fn();
    statusStub = jest.fn().mockReturnValue({ json: jsonStub });
    res = {
      status: statusStub,
      json: jsonStub
    };
  });

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('getConversations', () => {
    it('should return conversations with pagination', async () => {
      // Mock data
      const mockConversations = [
        { id: 1, call_id: 'call-123', campaign_id: 'campaign-1' },
        { id: 2, call_id: 'call-456', campaign_id: 'campaign-2' }
      ];

      // Set up mocks
      const findAndCountAllStub = jest.spyOn(Conversation, 'findAndCountAll').mockResolvedValue({
        count: 2,
        rows: mockConversations
      });

      // Set up request with pagination params
      req.query = { page: 1, limit: 10 };

      // Call the controller method
      await conversationController.getConversations(req, res);

      // Assertions
      expect(findAndCountAllStub).toHaveBeenCalledTimes(1);
      expect(statusStub).toHaveBeenCalledWith(200);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2,
          page: 1,
          totalPages: 1,
          conversations: mockConversations
        })
      );
    });

    it('should handle filtering by campaign_id', async () => {
      // Set up request with filter
      req.query = { campaign_id: 'campaign-1' };

      // Set up mock
      const findAndCountAllStub = jest.spyOn(Conversation, 'findAndCountAll').mockResolvedValue({
        count: 1,
        rows: [{ id: 1, call_id: 'call-123', campaign_id: 'campaign-1' }]
      });

      // Call the controller method
      await conversationController.getConversations(req, res);

      // Assertions
      expect(findAndCountAllStub).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaign_id: 'campaign-1' }
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Set up mock to throw error
      const error = new Error('Database error');
      const findAndCountAllStub = jest.spyOn(Conversation, 'findAndCountAll').mockRejectedValue(error);

      // Call the controller method
      await conversationController.getConversations(req, res);

      // Assertions
      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to retrieve conversations'
        })
      );
    });
  });

  describe('getConversationById', () => {
    it('should return a conversation by ID', async () => {
      // Mock data
      const mockConversation = {
        id: 1,
        call_id: 'call-123',
        campaign_id: 'campaign-1',
        metadata: { outcome: 'success' }
      };

      // Set up mock
      const findByPkStub = jest.spyOn(Conversation, 'findByPk').mockResolvedValue(mockConversation);

      // Set up request params
      req.params = { id: 1 };

      // Call the controller method
      await conversationController.getConversationById(req, res);

      // Assertions
      expect(findByPkStub).toHaveBeenCalledWith(1);
      expect(statusStub).toHaveBeenCalledWith(200);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          conversation: mockConversation
        })
      );
    });

    it('should return 404 if conversation is not found', async () => {
      // Set up mock to return null
      const findByPkStub = jest.spyOn(Conversation, 'findByPk').mockResolvedValue(null);

      // Set up request params
      req.params = { id: 999 };

      // Call the controller method
      await conversationController.getConversationById(req, res);

      // Assertions
      expect(statusStub).toHaveBeenCalledWith(404);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Conversation not found'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Set up mock to throw error
      const error = new Error('Database error');
      const findByPkStub = jest.spyOn(Conversation, 'findByPk').mockRejectedValue(error);

      // Set up request params
      req.params = { id: 1 };

      // Call the controller method
      await conversationController.getConversationById(req, res);

      // Assertions
      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to retrieve conversation'
        })
      );
    });
  });

  describe('updateConversationMetadata', () => {
    it('should update metadata for a conversation', async () => {
      // Mock data
      const mockConversation = {
        id: 1,
        metadata: { outcome: 'pending' },
        update: jest.fn().mockResolvedValue(true)
      };

      // Set up mock
      const findByPkStub = jest.spyOn(Conversation, 'findByPk').mockResolvedValue(mockConversation);

      // Set up request
      req.params = { id: 1 };
      req.body = { 
        metadata: { 
          outcome: 'success',
          topics: ['billing', 'support']
        } 
      };

      // Call the controller method
      await conversationController.updateConversationMetadata(req, res);

      // Assertions
      expect(findByPkStub).toHaveBeenCalledWith(1);
      expect(mockConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            outcome: 'success',
            topics: ['billing', 'support'],
            last_updated: expect.any(String)
          })
        })
      );
      expect(statusStub).toHaveBeenCalledWith(200);
    });

    it('should return 400 if metadata is missing', async () => {
      // Set up request with missing metadata
      req.params = { id: 1 };
      req.body = {}; // No metadata

      // Call the controller method
      await conversationController.updateConversationMetadata(req, res);

      // Assertions
      expect(statusStub).toHaveBeenCalledWith(400);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Metadata object is required'
        })
      );
    });

    it('should return 404 if conversation is not found', async () => {
      // Set up mock to return null
      const findByPkStub = jest.spyOn(Conversation, 'findByPk').mockResolvedValue(null);

      // Set up request
      req.params = { id: 999 };
      req.body = { metadata: { outcome: 'success' } };

      // Call the controller method
      await conversationController.updateConversationMetadata(req, res);

      // Assertions
      expect(statusStub).toHaveBeenCalledWith(404);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Conversation not found'
        })
      );
    });
  });

  describe('getConversationStats', () => {
    it('should retrieve conversation statistics', async () => {
      // Mock data
      const mockStats = [
        { outcome: 'success', count: '5' },
        { outcome: 'follow_up_required', count: '2' }
      ];
      
      // Create a conversation model mock with the required methods
      const originalSequelize = Conversation.sequelize;
      
      // Set up mocks
      const countStub = jest.fn()
        .mockResolvedValueOnce(10) // Total count
        .mockResolvedValueOnce(7); // With metadata count
      
      const queryStub = jest.fn().mockResolvedValue([mockStats]);
      
      // Mock the model and its methods
      jest.spyOn(Conversation, 'count').mockImplementation(countStub);
      jest.spyOn(Conversation, 'findOne').mockResolvedValue({
        duration_seconds: 120
      });
      
      // Replace sequelize temporarily
      Conversation.sequelize = { query: queryStub };
      
      // Call the controller method
      await conversationController.getConversationStats(req, res);
      
      // Restore original sequelize after test
      Conversation.sequelize = originalSequelize;

      // Assertions
      expect(countStub).toHaveBeenCalled();
      expect(queryStub).toHaveBeenCalled();
      expect(statusStub).toHaveBeenCalled();
      expect(jsonStub).toHaveBeenCalled();
    });


    it('should handle filtering by campaign_id', async () => {
      // Create a conversation model mock with the required methods
      const originalSequelize = Conversation.sequelize;
      
      // Set up mocks
      const countStub = jest.fn().mockResolvedValue(5);
      const queryStub = jest.fn().mockResolvedValue([[
        { outcome: 'success', count: '3' },
        { outcome: 'follow_up_required', count: '2' }
      ]]);
      
      // Mock the model and its methods
      jest.spyOn(Conversation, 'count').mockImplementation(countStub);
      jest.spyOn(Conversation, 'findOne').mockResolvedValue({
        duration_seconds: 90
      });
      
      // Replace sequelize temporarily
      Conversation.sequelize = { query: queryStub };

      // Set up request with filter
      req.query = { campaign_id: 'campaign-1' };

      // Call the controller method
      await conversationController.getConversationStats(req, res);
      
      // Restore original sequelize after test
      Conversation.sequelize = originalSequelize;

      // Assertions
      expect(countStub).toHaveBeenCalled();
      expect(queryStub).toHaveBeenCalled();
      expect(statusStub).toHaveBeenCalled();
      expect(jsonStub).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Set up mock to throw error
      const error = new Error('Database error');
      jest.spyOn(Conversation, 'count').mockRejectedValue(error);

      // Call the controller method
      await conversationController.getConversationStats(req, res);

      // Assertions
      expect(statusStub).toHaveBeenCalledWith(500);
      expect(jsonStub).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to retrieve conversation statistics'
        })
      );
    });
  });
});
