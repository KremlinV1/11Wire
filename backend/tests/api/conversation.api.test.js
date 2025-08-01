/**
 * Conversation API Integration Tests
 * Tests the API endpoints for conversation management
 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { expect } = chai;
chai.use(chaiHttp);

// Import models and server
const { Conversation, Campaign } = require('../../src/models');
const app = require('../../src/app');

describe('Conversation API Integration Tests', () => {
  beforeEach(() => {
    // Clean up any previous stubs
    sinon.restore();
  });

  describe('GET /api/conversations', () => {
    it('should return a list of conversations', async () => {
      // Mock data
      const mockConversations = [
        { 
          id: 1, 
          call_id: 'call-123', 
          campaign_id: 'campaign-1',
          metadata: { outcome: 'success', topics: ['billing'] },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { 
          id: 2, 
          call_id: 'call-456', 
          campaign_id: 'campaign-2',
          metadata: { outcome: 'follow_up_required', topics: ['support'] },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock the Sequelize findAndCountAll method
      sinon.stub(Conversation, 'findAndCountAll').resolves({
        count: mockConversations.length,
        rows: mockConversations
      });

      // Make the request
      const res = await chai
        .request(app)
        .get('/api/conversations')
        .query({ page: 1, limit: 10 });

      // Assertions
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.conversations).to.be.an('array').with.lengthOf(2);
      expect(res.body.conversations[0]).to.have.property('id', 1);
      expect(res.body.conversations[1]).to.have.property('id', 2);
      expect(res.body).to.have.property('totalPages');
    });

    it('should filter conversations by campaign_id', async () => {
      // Mock data
      const mockConversations = [
        { 
          id: 1, 
          call_id: 'call-123', 
          campaign_id: 'campaign-1',
          metadata: { outcome: 'success' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock the Sequelize findAndCountAll method
      const findAndCountAllStub = sinon.stub(Conversation, 'findAndCountAll').resolves({
        count: mockConversations.length,
        rows: mockConversations
      });

      // Make the request
      const res = await chai
        .request(app)
        .get('/api/conversations')
        .query({ campaign_id: 'campaign-1' });

      // Assertions
      expect(res).to.have.status(200);
      expect(findAndCountAllStub).to.have.been.calledWith(
        sinon.match({
          where: sinon.match({
            campaign_id: 'campaign-1'
          })
        })
      );
    });

    it('should filter conversations with metadata only', async () => {
      // Mock data
      const mockConversations = [
        { 
          id: 1, 
          call_id: 'call-123',
          metadata: { outcome: 'success' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock the Sequelize findAndCountAll method
      const findAndCountAllStub = sinon.stub(Conversation, 'findAndCountAll').resolves({
        count: mockConversations.length,
        rows: mockConversations
      });

      // Make the request
      const res = await chai
        .request(app)
        .get('/api/conversations')
        .query({ has_metadata: true });

      // Assertions
      expect(res).to.have.status(200);
      expect(findAndCountAllStub).to.have.been.calledWith(
        sinon.match({
          where: sinon.match.has('metadata')
        })
      );
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should return a specific conversation by ID', async () => {
      // Mock data
      const mockConversation = {
        id: 1,
        call_id: 'call-123',
        campaign_id: 'campaign-1',
        metadata: { 
          outcome: 'success',
          topics: ['billing'],
          sentiment: {
            positive: 0.7,
            negative: 0.1,
            neutral: 0.2
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [
          { role: 'agent', content: 'Hello, how can I help you?', timestamp: new Date() },
          { role: 'customer', content: 'I have a question about my bill.', timestamp: new Date() }
        ]
      };

      // Mock the Sequelize findByPk method
      sinon.stub(Conversation, 'findByPk').resolves(mockConversation);

      // Make the request
      const res = await chai
        .request(app)
        .get('/api/conversations/1');

      // Assertions
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.conversation).to.have.property('id', 1);
      expect(res.body.conversation).to.have.property('metadata');
      expect(res.body.conversation.metadata).to.have.property('outcome', 'success');
      expect(res.body.conversation).to.have.property('messages').with.lengthOf(2);
    });

    it('should return 404 for a non-existent conversation', async () => {
      // Mock the Sequelize findByPk method to return null
      sinon.stub(Conversation, 'findByPk').resolves(null);

      // Make the request
      const res = await chai
        .request(app)
        .get('/api/conversations/999');

      // Assertions
      expect(res).to.have.status(404);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Conversation not found');
    });
  });

  describe('PUT /api/conversations/:id/metadata', () => {
    it('should update conversation metadata', async () => {
      // Mock data
      const mockConversation = {
        id: 1,
        metadata: {},
        update: sinon.stub().resolves()
      };

      // Mock the Sequelize findByPk method
      sinon.stub(Conversation, 'findByPk').resolves(mockConversation);

      // New metadata to update
      const newMetadata = {
        outcome: 'success',
        topics: ['billing', 'payment'],
        action_items: ['Send follow-up email']
      };

      // Make the request
      const res = await chai
        .request(app)
        .put('/api/conversations/1/metadata')
        .send({ metadata: newMetadata });

      // Assertions
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(mockConversation.update).to.have.been.calledWith(
        sinon.match({
          metadata: sinon.match({
            outcome: 'success',
            topics: ['billing', 'payment'],
            action_items: ['Send follow-up email']
          })
        })
      );
    });

    it('should return 400 when metadata is missing', async () => {
      // Make the request with missing metadata
      const res = await chai
        .request(app)
        .put('/api/conversations/1/metadata')
        .send({}); // No metadata

      // Assertions
      expect(res).to.have.status(400);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Metadata object is required');
    });

    it('should return 404 for a non-existent conversation', async () => {
      // Mock the Sequelize findByPk method to return null
      sinon.stub(Conversation, 'findByPk').resolves(null);

      // Make the request
      const res = await chai
        .request(app)
        .put('/api/conversations/999/metadata')
        .send({ metadata: { outcome: 'success' } });

      // Assertions
      expect(res).to.have.status(404);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.equal('Conversation not found');
    });
  });

  describe('GET /api/conversations/stats', () => {
    it('should return conversation statistics', async () => {
      // Mock the Sequelize methods
      const countStub = sinon.stub(Conversation, 'count');
      countStub.onFirstCall().resolves(15); // Total count
      countStub.onSecondCall().resolves(10); // With metadata count

      const sequelizeStub = {
        query: sinon.stub().resolves([
          [
            { outcome: 'success', count: '7' },
            { outcome: 'follow_up_required', count: '3' }
          ]
        ])
      };

      sinon.stub(Conversation, 'sequelize').get(() => sequelizeStub);

      sinon.stub(Conversation, 'findOne').resolves({
        get: () => 180 // Average duration 3 minutes
      });

      // Make the request
      const res = await chai
        .request(app)
        .get('/api/conversations/stats');

      // Assertions
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body.success).to.be.true;
      expect(res.body.stats).to.have.property('total', 15);
      expect(res.body.stats).to.have.property('with_metadata', 10);
      expect(res.body.stats).to.have.property('outcomes');
      expect(res.body.stats.outcomes).to.have.property('success', 7);
      expect(res.body.stats.outcomes).to.have.property('follow_up_required', 3);
      expect(res.body.stats).to.have.property('avg_duration', 180);
    });

    it('should filter statistics by campaign_id', async () => {
      // Mock the Sequelize methods
      const countStub = sinon.stub(Conversation, 'count').resolves(0);
      
      // Setup sequelize query mock
      const sequelizeStub = {
        query: sinon.stub().resolves([[]])
      };
      sinon.stub(Conversation, 'sequelize').get(() => sequelizeStub);
      
      // Mock findOne
      sinon.stub(Conversation, 'findOne').resolves({ get: () => 0 });

      // Make the request with campaign_id filter
      const res = await chai
        .request(app)
        .get('/api/conversations/stats')
        .query({ campaign_id: 'campaign-1' });

      // Assertions
      expect(res).to.have.status(200);
      expect(countStub).to.have.been.calledWith(
        sinon.match({
          where: sinon.match({
            campaign_id: 'campaign-1'
          })
        })
      );
    });
  });
});
