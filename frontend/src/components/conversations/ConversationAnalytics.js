import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form,
  Button,
  Table,
  Alert,
  Spinner
} from 'react-bootstrap';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { getConversationStats } from '../../services/conversationService';
import { getAllCampaigns } from '../../services/campaignService';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip, 
  Legend
);

const ConversationAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    campaign_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch campaigns for filter dropdown
        const campaignsResponse = await getAllCampaigns();
        setCampaigns(campaignsResponse.campaigns || []);
        
        // Fetch initial stats
        const statsResponse = await getConversationStats();
        setStats(statsResponse.stats);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load analytics data');
        setLoading(false);
        console.error('Error fetching analytics data:', err);
      }
    };

    fetchInitialData();
  }, []);

  const fetchFilteredStats = async () => {
    try {
      setLoading(true);
      
      // Apply filters to stats request
      const statsResponse = await getConversationStats(filters);
      setStats(statsResponse.stats);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load filtered analytics data');
      setLoading(false);
      console.error('Error fetching filtered analytics data:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const handleApplyFilters = () => {
    fetchFilteredStats();
  };

  const handleClearFilters = () => {
    setFilters({
      campaign_id: '',
      start_date: '',
      end_date: '',
    });
    fetchFilteredStats();
  };

  // Prepare data for outcome pie chart
  const prepareOutcomeChartData = () => {
    if (!stats || !stats.outcomes) return null;

    const outcomes = stats.outcomes;
    const labels = Object.keys(outcomes).map(key => 
      key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );
    
    const data = Object.values(outcomes).map(value => parseInt(value));
    const backgroundColors = [
      '#4CAF50', // success - green
      '#FFC107', // follow_up_required - amber
      '#2196F3', // appointment_scheduled - blue
      '#F44336', // unresolved - red
      '#9C27B0', // other - purple
      '#FF9800', // other - orange
      '#795548'  // other - brown
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderColor: backgroundColors.slice(0, labels.length).map(color => color),
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare data for metadata coverage bar chart
  const prepareMetadataCoverageData = () => {
    if (!stats) return null;

    return {
      labels: ['With Metadata', 'Without Metadata'],
      datasets: [
        {
          label: 'Conversations',
          data: [
            stats.with_metadata || 0,
            (stats.total || 0) - (stats.with_metadata || 0)
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderFilters = () => (
    <Card className="mb-4">
      <Card.Header>Filter Analytics</Card.Header>
      <Card.Body>
        <Form>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Campaign</Form.Label>
                <Form.Control
                  as="select"
                  name="campaign_id"
                  value={filters.campaign_id}
                  onChange={handleFilterChange}
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={4}>
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
            <Col md={4}>
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
          </Row>
          <div className="d-flex justify-content-end">
            <Button
              variant="secondary"
              className="me-2"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
            <Button
              variant="primary"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );

  const renderSummaryStats = () => (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="h-100 text-center">
          <Card.Body>
            <h2 className="display-4">{stats?.total || 0}</h2>
            <p className="text-muted">Total Conversations</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="h-100 text-center">
          <Card.Body>
            <h2 className="display-4">{formatDuration(stats?.avg_duration)}</h2>
            <p className="text-muted">Average Duration</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="h-100 text-center">
          <Card.Body>
            <h2 className="display-4">{stats?.with_metadata || 0}</h2>
            <p className="text-muted">With Metadata</p>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="h-100 text-center">
          <Card.Body>
            <h2 className="display-4">
              {stats && stats.total 
                ? `${Math.round((stats.with_metadata / stats.total) * 100)}%` 
                : '0%'}
            </h2>
            <p className="text-muted">Metadata Coverage</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const renderCharts = () => {
    const outcomeData = prepareOutcomeChartData();
    const metadataData = prepareMetadataCoverageData();

    return (
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>Conversation Outcomes</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
              {outcomeData && outcomeData.labels.length > 0 ? (
                <Pie 
                  data={outcomeData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center text-muted">
                  No outcome data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>Metadata Coverage</Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
              {metadataData ? (
                <Bar
                  data={metadataData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            const total = stats.total || 0;
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center text-muted">
                  No metadata coverage data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderTopicsList = () => {
    // Extract topics from the conversations with metadata
    const topicsCount = {};
    
    if (!stats || !stats.topics) {
      return (
        <Card className="mb-4">
          <Card.Header>Top Topics</Card.Header>
          <Card.Body>
            <div className="text-center text-muted">
              No topic data available
            </div>
          </Card.Body>
        </Card>
      );
    }

    // If we have topics data from the backend
    return (
      <Card className="mb-4">
        <Card.Header>Top Topics</Card.Header>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.topics || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([topic, count]) => (
                  <tr key={topic}>
                    <td>{topic}</td>
                    <td>{count}</td>
                    <td>
                      {stats.with_metadata
                        ? `${Math.round((count / stats.with_metadata) * 100)}%`
                        : '0%'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container className="my-4">
      <h2>Conversation Analytics</h2>
      
      {renderFilters()}
      
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading analytics data...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          {renderSummaryStats()}
          {renderCharts()}
          {renderTopicsList()}
        </>
      )}
    </Container>
  );
};

export default ConversationAnalytics;
