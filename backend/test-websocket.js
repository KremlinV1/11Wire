const WebSocket = require('ws');

console.log('🔌 Simple WebSocket connection test');
console.log('Attempting to connect to WebSocket server at ws://localhost:3000/stream...');

const ws = new WebSocket('ws://localhost:3000/stream');

ws.on('open', () => {
  console.log('✅ WebSocket connection successful!');
  // Close the connection after a successful test
  setTimeout(() => {
    ws.close();
    console.log('Connection closed after successful test');
    process.exit(0);
  }, 2000);
});

ws.on('error', (error) => {
  console.log(`❌ WebSocket connection failed: ${error.message}`);
  process.exit(1);
});

// Set a timeout in case the connection attempt hangs
setTimeout(() => {
  console.log('❌ WebSocket connection timed out after 5 seconds');
  process.exit(1);
}, 5000);
