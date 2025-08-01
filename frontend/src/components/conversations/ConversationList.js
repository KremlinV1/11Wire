import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Table, 
  Button, 
  Card, 
  Pagination, 
  Badge, 
  Form, 
  Row, 
  Col 
} from 'react-bootstrap';
import { getConversations, formatConversationMetadata } from '../../services/conversationService';
import { format } from 'date-fns';

const ConversationList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    campaign_id: '',
    start_date: '',
    end_date: '',
    has_metadata: false,
  });

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };
      
      const response = await getConversations(params);
      setConversations(response.conversations);
      setTotalPages(response.totalPages);
      setLoading(false);
    } catch (err) {
      setError('Failed to load conversations');
      setLoading(false);
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [currentPage, filters]);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getOutcomeBadgeVariant = (outcome) => {
    switch (outcome?.toLowerCase()) {
      case 'success':
      case 'resolved':
        return 'success';
      case 'follow_up_required':
        return 'warning';
      case 'appointment_scheduled':
        return 'info';
      case 'failed':
      case 'unresolved':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    return (
      <Pagination>
        <Pagination.Prev
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        />
        {pages}
        <Pagination.Next
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        />
      </Pagination>
    );
  };

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Conversation History</h2>
        <Button 
          variant="outline-primary" 
          as="a" 
          href="/conversations/analytics"
        >
          View Analytics
        </Button>
      </div>
      <Card className="mb-4">
        <Card.Header>Filters</Card.Header>
        <Card.Body>
          <Form>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Campaign</Form.Label>
                  <Form.Control
                    as="select"
                    name="campaign_id"
                    value={filters.campaign_id}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Campaigns</option>
                    {/* Campaign options would come from state */}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="start_date"
                    value={filters.start_date}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="end_date"
                    value={filters.end_date}
                    onChange={handleFilterChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3 pt-4">
                  <Form.Check
                    type="checkbox"
                    name="has_metadata"
                    checked={filters.has_metadata}
                    onChange={handleFilterChange}
                    label="With Metadata Only"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-4">Loading conversations...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Call ID</th>
                <th>Campaign</th>
                <th>Duration</th>
                <th>Outcome</th>
                <th>Topics</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No conversations found
                  </td>
                </tr>
              ) : (
                conversations.map((conversation) => {
                  const metadata = formatConversationMetadata(conversation.metadata);
                  return (
                    <tr key={conversation.id}>
                      <td>
                        {format(new Date(conversation.createdAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td>{conversation.call_id}</td>
                      <td>
                        {conversation.campaign
                          ? conversation.campaign.name
                          : 'N/A'}
                      </td>
                      <td>
                        {conversation.duration_seconds
                          ? `${Math.floor(conversation.duration_seconds / 60)}:${String(
                              conversation.duration_seconds % 60
                            ).padStart(2, '0')}`
                          : 'N/A'}
                      </td>
                      <td>
                        {metadata.outcome && (
                          <Badge bg={getOutcomeBadgeVariant(metadata.outcome)}>
                            {metadata.outcome.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </td>
                      <td>
                        {metadata.topics.length > 0
                          ? metadata.topics.slice(0, 2).map((topic, i) => (
                              <Badge bg="info" key={i} className="me-1">
                                {topic}
                              </Badge>
                            ))
                          : 'No topics'}
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          href={`/conversations/${conversation.id}`}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
          {conversations.length > 0 && renderPagination()}
        </>
      )}
    </Container>
  );
};

export default ConversationList;
