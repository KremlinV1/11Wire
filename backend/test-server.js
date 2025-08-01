const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is running');
});

// Try to listen on port 3000
server.listen(3000, () => {
  console.log('Test server running on port 3000');
});

// Log any errors
server.on('error', (err) => {
  console.error('Server error:', err.message);
});
