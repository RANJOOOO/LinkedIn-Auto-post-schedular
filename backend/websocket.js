const WebSocket = require('ws');
const Post = require('./models/Post');
const GPTService = require('./services/gptService');

class WebSocketServer {
  constructor(server) {
    console.log('Initializing WebSocket server...');
    this.wss = new WebSocket.Server({ 
      server,
      perMessageDeflate: false,
      clientTracking: true
    });
    this.clients = new Set();
    this.setupWebSocket();
    this.startScheduler();
    console.log('WebSocket server initialized');
  }

  setupWebSocket() {
    console.log('Setting up WebSocket handlers...');
    this.wss.on('connection', async (ws, req) => {
      console.log('New WebSocket connection established from:', req.socket.remoteAddress);
      this.clients.add(ws);
      console.log('Total connected clients:', this.clients.size);

      // Set up ping/pong
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // When a client connects, check for any pending posts
      try {
        await this.checkPendingPosts(ws);
      } catch (error) {
        console.error('Error checking pending posts on connection:', error);
      }

      ws.on('close', () => {
        console.log('Client disconnected from:', req.socket.remoteAddress);
        this.clients.delete(ws);
        console.log('Remaining connected clients:', this.clients.size);
      });

      // Handle incoming messages from clients
      ws.on('message', async (message) => {
        try {
          const rawMessage = message.toString();
          console.log('Raw message received from client:', rawMessage);
          const data = JSON.parse(rawMessage);
          console.log('Parsed WebSocket message:', JSON.stringify(data, null, 2));
          
          // Send acknowledgment
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ack',
              message: 'Message received',
              timestamp: Date.now()
            }));
          }
          
          switch (data.type) {
            case 'test_connection':
              console.log('Received test connection message');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'test_connection_response',
                  message: 'Connection test successful',
                  timestamp: Date.now()
                }));
                console.log('Sent test connection response');
              }
              break;

            case 'get_posts':
              try {
                console.log('Fetching all scheduled posts...');
                const query = {
                  status: { $in: ['scheduled', 'pending', 'posting'] }
                };
                console.log('Using query:', JSON.stringify(query, null, 2));
                
                const posts = await Post.find(query).sort({ scheduledTime: 1 });
                console.log(`Found ${posts.length} posts:`, JSON.stringify(posts, null, 2));
                
                const response = {
                  type: 'posts_list',
                  posts: posts.map(post => ({
                    postId: post._id.toString(),
                    content: post.content,
                    scheduledTime: post.scheduledTime ? post.scheduledTime.toISOString() : null,
                    hashtags: post.hashtags || [],
                    status: post.status,
                    title: post.title
                  }))
                };
                console.log('Preparing to send response to client:', JSON.stringify(response, null, 2));
                
                // Send the response
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify(response));
                  console.log('Response sent successfully to client');
                } else {
                  console.error('WebSocket is not in OPEN state. Current state:', ws.readyState);
                }
              } catch (error) {
                console.error('Error fetching posts:', error);
                const errorResponse = {
                  type: 'error',
                  message: 'Failed to fetch posts',
                  error: error.message
                };
                console.log('Sending error response:', JSON.stringify(errorResponse, null, 2));
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify(errorResponse));
                }
              }
              break;

            case 'post_status':
              try {
                await Post.findByIdAndUpdate(data.postId, {
                  status: data.status,
                  postUrl: data.postUrl,
                  ...(data.error && { error: { message: data.error, timestamp: new Date() } })
                });
                console.log(`Updated post status for ${data.postId} to ${data.status}`);
              } catch (error) {
                console.error('Error updating post status:', error);
              }
              break;

            case 'engagement_update':
              try {
                await Post.findByIdAndUpdate(data.postId, {
                  'engagement.likes': data.engagement.likes,
                  'engagement.comments': data.engagement.comments,
                  'engagement.shares': data.engagement.shares,
                  'engagement.views': data.engagement.views,
                  'engagement.lastUpdated': new Date()
                });
                console.log(`Updated engagement for post ${data.postId}`);
              } catch (error) {
                console.error('Error updating engagement:', error);
              }
              break;

            case 'new_engager':
              try {
                await Post.findByIdAndUpdate(data.postId, {
                  $push: {
                    engagers: {
                      profileUrl: data.profileUrl,
                      type: data.engagementType,
                      timestamp: new Date()
                    }
                  }
                });
                console.log(`Added new engager to post ${data.postId}`);
              } catch (error) {
                console.error('Error adding engager:', error);
              }
              break;

            case 'generate_message':
              try {
                console.log('Generating connection message...');
                const { postContent, reactorInfo } = data;
                
                // Generate message using GPT service
                const message = await GPTService.generateConnectionMessage(postContent, reactorInfo);
                
                // Send the generated message back to the client
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'message_generated',
                    message: message,
                    messageId: data.messageId
                  }));
                  console.log('Message generated and sent to client');
                }
              } catch (error) {
                console.error('Error generating message:', error);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to generate message',
                    error: error.message,
                    messageId: data.messageId
                  }));
                }
              }
              break;

            case 'client_ready':
              // Client is ready to process posts
              await this.checkPendingPosts(ws);
              break;

            default:
              console.log('Unknown message type received:', data.type);
          }
        } catch (error) {
          console.error('WebSocket message handling error:', error);
          const errorResponse = {
            type: 'error',
            message: 'Failed to process message',
            error: error.message
          };
          console.log('Sending error response:', JSON.stringify(errorResponse, null, 2));
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(errorResponse));
          }
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Set up ping interval
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('Client connection timed out');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  async checkPendingPosts(ws) {
    try {
      // Find all posts that are due but not yet posted
      const pendingPosts = await Post.find({
        scheduledTime: { $lte: new Date() },
        status: 'scheduled'
      });

      // Send each pending post to the client
      for (const post of pendingPosts) {
        ws.send(JSON.stringify({
          type: 'post_due',
          postId: post._id,
          content: post.content,
          hashtags: post.hashtags
        }));

        // Update post status to posting
        await Post.findByIdAndUpdate(post._id, { status: 'posting' });
      }
    } catch (error) {
      console.error('Error checking pending posts:', error);
    }
  }

  startScheduler() {
    // Check for due posts every 6 hours
    setInterval(async () => {
      try {
        const now = new Date();
        const duePosts = await Post.find({
          scheduledTime: { $lte: now },
          status: 'scheduled'
        });

        for (const post of duePosts) {
          // Notify all connected clients about the due post
          this.broadcast({
            type: 'post_due',
            postId: post._id,
            content: post.content,
            hashtags: post.hashtags
          });

          // Update post status to posting
          await Post.findByIdAndUpdate(post._id, { status: 'posting' });
        }
      } catch (error) {
        console.error('Scheduler error:', error);
      }
    }, 21600000); // Check every 6 hours (6 * 60 * 60 * 1000)
  }

  broadcast(message) {
    console.log('Broadcasting message to all clients:', JSON.stringify(message, null, 2));
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        console.log('Message sent to client');
      } else {
        console.log('Client not in OPEN state, skipping');
      }
    });
  }
}

module.exports = WebSocketServer; 