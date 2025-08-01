import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Row, 
  Col, 
  Badge, 
  ListGroup,
  Button,
  Form,
  Alert
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getConversationById, updateConversationMetadata } from '../../services/conversationService';
import { format } from 'date-fns';

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const response = await getConversationById(id);
        setConversation(response.conversation);
        setEditedMetadata(response.conversation.metadata || {});
        setLoading(false);
      } catch (err) {
        setError('Failed to load conversation details');
        setLoading(false);
        console.error('Error fetching conversation:', err);
      }
    };

    fetchConversation();
  }, [id]);

  const handleBack = () => {
    navigate('/conversations');
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    // Reset form when toggling edit mode
    if (!editMode) {
      setEditedMetadata(conversation.metadata || {});
      setSaveSuccess(false);
      setSaveError(null);
    }
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties (e.g., 'sentiment.positive')
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditedMetadata({
        ...editedMetadata,
        [parent]: {
          ...(editedMetadata[parent] || {}),
          [child]: value
        }
      });
    } else {
      setEditedMetadata({
        ...editedMetadata,
        [name]: value
      });
    }
  };

  const handleArrayChange = (key, index, value) => {
    const newArray = [...(editedMetadata[key] || [])];
    newArray[index] = value;
    
    setEditedMetadata({
      ...editedMetadata,
      [key]: newArray
    });
  };

  const handleAddArrayItem = (key) => {
    setEditedMetadata({
      ...editedMetadata,
      [key]: [...(editedMetadata[key] || []), '']
    });
  };

  const handleRemoveArrayItem = (key, index) => {
    const newArray = [...(editedMetadata[key] || [])];
    newArray.splice(index, 1);
    
    setEditedMetadata({
      ...editedMetadata,
      [key]: newArray
    });
  };

  const handleSaveMetadata = async () => {
    try {
      setSaveError(null);
      setSaveSuccess(false);
      
      await updateConversationMetadata(id, editedMetadata);
      
      // Update local state with the edited metadata
      setConversation({
        ...conversation,
        metadata: editedMetadata
      });
      
      setSaveSuccess(true);
      setEditMode(false);
    } catch (err) {
      setSaveError('Failed to save metadata');
      console.error('Error updating metadata:', err);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return format(new Date(timestamp), 'MMM d, yyyy h:mm:ss a');
  };

  const renderMessages = () => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return <Alert variant="info">No conversation messages available</Alert>;
    }

    return (
      <Card className="mb-4">
        <Card.Header>Conversation Transcript</Card.Header>
        <ListGroup variant="flush">
          {conversation.messages.map((message, index) => (
            <ListGroup.Item 
              key={index}
              className={message.role === 'agent' ? 'bg-light' : ''}
            >
              <strong>{message.role === 'agent' ? 'Agent' : 'Customer'}:</strong> {message.content}
              <div className="text-muted small">
                {message.timestamp ? formatTimestamp(message.timestamp) : ''}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    );
  };

  const renderMetadataView = () => {
    const metadata = conversation.metadata || {};
    
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Conversation Metadata</span>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={handleEditToggle}
          >
            Edit Metadata
          </Button>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p><strong>Outcome:</strong> {metadata.outcome || 'Not specified'}</p>
              <p>
                <strong>Sentiment:</strong>{' '}
                {metadata.sentiment ? (
                  <>
                    Positive: {metadata.sentiment.positive || 0}, 
                    Negative: {metadata.sentiment.negative || 0}, 
                    Neutral: {metadata.sentiment.neutral || 0}
                  </>
                ) : 'Not analyzed'}
              </p>
            </Col>
            <Col md={6}>
              <p>
                <strong>Topics:</strong>{' '}
                {metadata.topics && metadata.topics.length > 0 ? 
                  metadata.topics.map((topic, i) => (
                    <Badge bg="info" key={i} className="me-1">{topic}</Badge>
                  )) : 'No topics identified'
                }
              </p>
            </Col>
          </Row>
          
          <hr />
          
          <Row>
            <Col md={12}>
              <p><strong>Key Points:</strong></p>
              {metadata.key_points && metadata.key_points.length > 0 ? (
                <ul>
                  {metadata.key_points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No key points identified</p>
              )}
            </Col>
          </Row>
          
          <hr />
          
          <Row>
            <Col md={12}>
              <p><strong>Action Items:</strong></p>
              {metadata.action_items && metadata.action_items.length > 0 ? (
                <ul>
                  {metadata.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No action items identified</p>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderMetadataEdit = () => {
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Edit Conversation Metadata</span>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={handleEditToggle}
          >
            Cancel
          </Button>
        </Card.Header>
        <Card.Body>
          {saveSuccess && (
            <Alert variant="success" dismissible onClose={() => setSaveSuccess(false)}>
              Metadata updated successfully
            </Alert>
          )}
          
          {saveError && (
            <Alert variant="danger" dismissible onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Outcome</Form.Label>
              <Form.Control
                as="select"
                name="outcome"
                value={editedMetadata.outcome || ''}
                onChange={handleMetadataChange}
              >
                <option value="">Select Outcome</option>
                <option value="success">Success</option>
                <option value="follow_up_required">Follow Up Required</option>
                <option value="appointment_scheduled">Appointment Scheduled</option>
                <option value="unresolved">Unresolved</option>
              </Form.Control>
            </Form.Group>
            
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Positive Sentiment (0-1)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    name="sentiment.positive"
                    value={(editedMetadata.sentiment?.positive || 0)}
                    onChange={handleMetadataChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Negative Sentiment (0-1)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    name="sentiment.negative"
                    value={(editedMetadata.sentiment?.negative || 0)}
                    onChange={handleMetadataChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Neutral Sentiment (0-1)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    name="sentiment.neutral"
                    value={(editedMetadata.sentiment?.neutral || 0)}
                    onChange={handleMetadataChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Topics</Form.Label>
              {(editedMetadata.topics || []).map((topic, index) => (
                <div className="d-flex mb-2" key={index}>
                  <Form.Control
                    type="text"
                    value={topic}
                    onChange={(e) => handleArrayChange('topics', index, e.target.value)}
                    className="me-2"
                  />
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleRemoveArrayItem('topics', index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => handleAddArrayItem('topics')}
              >
                Add Topic
              </Button>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Key Points</Form.Label>
              {(editedMetadata.key_points || []).map((point, index) => (
                <div className="d-flex mb-2" key={index}>
                  <Form.Control
                    type="text"
                    value={point}
                    onChange={(e) => handleArrayChange('key_points', index, e.target.value)}
                    className="me-2"
                  />
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleRemoveArrayItem('key_points', index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => handleAddArrayItem('key_points')}
              >
                Add Key Point
              </Button>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Action Items</Form.Label>
              {(editedMetadata.action_items || []).map((item, index) => (
                <div className="d-flex mb-2" key={index}>
                  <Form.Control
                    type="text"
                    value={item}
                    onChange={(e) => handleArrayChange('action_items', index, e.target.value)}
                    className="me-2"
                  />
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleRemoveArrayItem('action_items', index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => handleAddArrayItem('action_items')}
              >
                Add Action Item
              </Button>
            </Form.Group>
            
            <div className="d-flex justify-content-end mt-4">
              <Button 
                variant="secondary" 
                onClick={handleEditToggle} 
                className="me-2"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveMetadata}
              >
                Save Changes
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container className="my-4">
        <div className="text-center py-4">Loading conversation details...</div>
      </Container>
    );
  }

  if (error || !conversation) {
    return (
      <Container className="my-4">
        <Alert variant="danger">
          {error || 'Failed to load conversation'}
        </Alert>
        <Button variant="primary" onClick={handleBack}>
          Back to Conversations
        </Button>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Conversation Details</h2>
        <Button variant="outline-primary" onClick={handleBack}>
          Back to Conversations
        </Button>
      </div>
      
      <Card className="mb-4">
        <Card.Header>Overview</Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p><strong>Call ID:</strong> {conversation.call_id}</p>
              <p><strong>Date:</strong> {formatTimestamp(conversation.createdAt)}</p>
              <p>
                <strong>Campaign:</strong>{' '}
                {conversation.campaign ? conversation.campaign.name : 'N/A'}
              </p>
            </Col>
            <Col md={6}>
              <p>
                <strong>Duration:</strong>{' '}
                {conversation.duration_seconds
                  ? `${Math.floor(conversation.duration_seconds / 60)}:${String(
                      conversation.duration_seconds % 60
                    ).padStart(2, '0')}`
                  : 'N/A'}
              </p>
              <p><strong>Agent ID:</strong> {conversation.agent_id || 'N/A'}</p>
              <p>
                <strong>Recording:</strong>{' '}
                {conversation.recording ? (
                  <Button 
                    variant="link" 
                    size="sm"
                    href={`/api/call-recordings/${conversation.recording.id}/download`}
                    target="_blank"
                  >
                    Download Recording
                  </Button>
                ) : 'No recording available'}
              </p>
            </Col>
          </Row>
          
          <Row>
            <Col md={12}>
              <p><strong>Summary:</strong></p>
              <p>{conversation.summary || 'No summary available'}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {editMode ? renderMetadataEdit() : renderMetadataView()}
      
      {renderMessages()}
    </Container>
  );
};

export default ConversationDetail;
