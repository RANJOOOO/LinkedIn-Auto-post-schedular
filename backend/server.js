const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const Post = require('./models/Post');
const Engagement = require('./models/Engagement');
const ProfileUrl = require('./models/ProfileUrl');
const postsRouter = require('./routes/posts');
require('dotenv').config();

console.log('Starting server initialization...');

const app = express();
const server = http.createServer(app);

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established from:', req.socket.remoteAddress);
  clients.add(ws);
  console.log('Total connected clients:', clients.size);

  // Send initial connection success message
  ws.send(JSON.stringify({
    type: 'connection_status',
    connected: true,
    message: 'Connected to server'
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      // Diagnostic log for message type
      console.log('WebSocket message type:', data.type);
      console.log('Received message:', data);

      switch ((data.type || '').trim()) {
        case 'test_connection':
          // Send test connection response
          ws.send(JSON.stringify({
            type: 'test_connection_response',
            message: 'Connection test successful',
            timestamp: Date.now()
          }));
          break;

        case 'get_posts':
          try {
            // Fetch posts from database
            const posts = await Post.find({}).sort({ scheduledTime: 1 });
            console.log('Found posts:', posts.length);
            
            // Send posts to client
            ws.send(JSON.stringify({
              type: 'posts_list',
              posts: posts.map(post => ({
                _id: post._id.toString(),
                content: post.content,
                scheduledTime: post.scheduledTime,
                originalScheduledTime: post.originalScheduledTime,
                status: post.status,
                hashtags: post.hashtags || [],
                reschedulingHistory: post.reschedulingHistory || []
              }))
            }));
          } catch (error) {
            console.error('Error fetching posts:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to fetch posts',
              error: error.message
            }));
          }
          break;

        case 'check_profile':
          try {
            const { profileUrl } = data;
            const profile = await Engagement.findOne({ profileUrl });
            
            ws.send(JSON.stringify({
              type: 'profile_status',
              exists: !!profile,
              connectionSent: profile?.connectionSent || false,
              followUpSent: profile?.followUpSent || false
            }));
          } catch (error) {
            console.error('Error checking profile:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to check profile',
              error: error.message
            }));
          }
          break;

        // --- BATCH PROFILE CHECK (NEW, non-breaking) ---
        case 'check_profiles_batch':
          try {
            const { profileUrls } = data;
            if (!Array.isArray(profileUrls)) throw new Error('profileUrls must be an array');
            const foundProfiles = await Engagement.find({ profileUrl: { $in: profileUrls } }).select('profileUrl');
            const foundUrls = foundProfiles.map(p => p.profileUrl);
            ws.send(JSON.stringify({
              type: 'profiles_status_batch',
              existing: foundUrls,
              notExisting: profileUrls.filter(url => !foundUrls.includes(url))
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to batch check profiles',
              error: error.message
            }));
          }
          break;

        case 'save_profile':
          try {
            const { profileUrl, name } = data;
            
            // Check if profile already exists
            const existingProfile = await Engagement.findOne({ profileUrl });
            if (existingProfile) {
              ws.send(JSON.stringify({
                type: 'profile_saved',
                profile: {
                  profileUrl: existingProfile.profileUrl,
                  name: existingProfile.name,
                  connectionSent: existingProfile.connectionSent,
                  followUpSent: existingProfile.followUpSent
                }
              }));
              return;
            }

            // Create new profile
            const profile = new Engagement({ profileUrl, name });
            await profile.save();
            
            ws.send(JSON.stringify({
              type: 'profile_saved',
              profile: {
                profileUrl: profile.profileUrl,
                name: profile.name,
                connectionSent: profile.connectionSent,
                followUpSent: profile.followUpSent
              }
            }));
          } catch (error) {
            console.error('Error saving profile:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to save profile',
              error: error.message
            }));
          }
          break;

        case 'update_connection_status':
          try {
            const { profileUrl } = data;
            const profile = await Engagement.findOneAndUpdate(
              { profileUrl },
              { connectionSent: true },
              { new: true }
            );
            
            if (!profile) {
              throw new Error('Profile not found');
            }
            
            ws.send(JSON.stringify({
              type: 'connection_status_updated',
              profile: {
                profileUrl: profile.profileUrl,
                connectionSent: profile.connectionSent
              }
            }));
          } catch (error) {
            console.error('Error updating connection status:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to update connection status',
              error: error.message
            }));
          }
          break;

        case 'update_followup_status':
          try {
            const { profileUrl } = data;
            const profile = await Engagement.findOneAndUpdate(
              { profileUrl },
              { followUpSent: true },
              { new: true }
            );
            
            if (!profile) {
              throw new Error('Profile not found');
            }
            
            ws.send(JSON.stringify({
              type: 'followup_status_updated',
              profile: {
                profileUrl: profile.profileUrl,
                followUpSent: profile.followUpSent
              }
            }));
          } catch (error) {
            console.error('Error updating followup status:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to update followup status',
              error: error.message
            }));
          }
          break;

        case 'post_status':
          try {
            const { postId, status, postUrl, rescheduled, originalTime } = data;
            console.log('Updating post status:', { postId, status, postUrl });
            
            let query = {};
            // Try to convert to ObjectId if possible
            if (mongoose.Types.ObjectId.isValid(postId)) {
              query._id = new mongoose.Types.ObjectId(postId);
            } else {
              query._id = postId; // Use as string
            }

            const update = { status, postUrl, lastUpdated: new Date() };
            
            if (rescheduled) {
              update.originalScheduledTime = originalTime;
              update.status = 'rescheduled';
            }
            
            const post = await Post.findOneAndUpdate(
              query,
              update,
              { new: true }
            );
            
            if (!post) {
              console.error('Post not found:', postId);
              throw new Error(`Post not found: ${postId}`);
            }
            
            console.log('Post updated successfully:', post._id);
            ws.send(JSON.stringify({
              type: 'post_status_updated',
              postId: post._id.toString(),
              status: post.status
            }));

            // Broadcast the update to all connected clients
            clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'post_updated',
                  post: {
                    id: post._id,
                    status: post.status,
                    postUrl: post.postUrl
                  }
                }));
              }
            });
          } catch (error) {
            console.error('Error updating post status:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: error.message
            }));
          }
          break;

        case 'post_rescheduled':
          try {
            const { postId, originalTime, newTime, reason } = data;
            
            // Convert string ID to ObjectId if needed
            let queryId = postId;
            if (mongoose.Types.ObjectId.isValid(postId)) {
              queryId = new mongoose.Types.ObjectId(postId);
            }
            
            const post = await Post.findByIdAndUpdate(
              queryId,
              {
                $set: {
                  scheduledTime: new Date(newTime),
                  originalScheduledTime: new Date(originalTime),
                  status: 'rescheduled'
                },
                $push: {
                  reschedulingHistory: {
                    fromTime: originalTime,
                    toTime: newTime,
                    reason: reason || 'LinkedIn minimum scheduling time requirement'
                  }
                }
              },
              { new: true }
            );
            
            if (!post) {
              throw new Error('Post not found');
            }
            
            // Broadcast the rescheduling to all connected clients
            clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'post_rescheduled_confirmed',
                  postId,
                  newTime: post.scheduledTime,
                  originalTime: post.originalScheduledTime,
                  reason: reason
                }));
              }
            });
          } catch (error) {
            console.error('Error rescheduling post:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to reschedule post',
              error: error.message
            }));
          }
          break;

        case 'save_profile_url':
          try {
            const { profileUrl } = data;
            
            // Delete all existing URLs first
            await ProfileUrl.deleteMany({});
            
            // Create new URL entry
            const profile = new ProfileUrl({ profileUrl });
            await profile.save();
            
            ws.send(JSON.stringify({
              type: 'profile_url_saved',
              profileUrl: profile.profileUrl,
              savedAt: profile.savedAt
            }));
          } catch (error) {
            console.error('Error saving profile URL:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to save profile URL',
              error: error.message
            }));
          }
          break;

        case 'get_profile_url':
          try {
            // Get the single URL document
            const profile = await ProfileUrl.findOne();
            
            ws.send(JSON.stringify({
              type: 'profile_url_retrieved',
              profileUrl: profile ? profile.profileUrl : null,
              savedAt: profile ? profile.savedAt : null
            }));
          } catch (error) {
            console.error('Error getting profile URL:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to get profile URL',
              error: error.message
            }));
          }
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from:', req.socket.remoteAddress);
    clients.delete(ws);
    console.log('Remaining connected clients:', clients.size);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
    console.log('Remaining connected clients:', clients.size);
  });
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Test endpoint for WebSocket
app.get('/test-ws', (req, res) => {
  const testMessage = {
    type: 'test',
    message: 'Test message from server',
    timestamp: Date.now()
  };

  // Broadcast test message to all connected clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(testMessage));
    }
  });

  res.json({ message: 'Test message sent to all connected clients' });
});

// Routes
const topicRoutes = require('./routes/topics');
const engagementRoutes = require('./routes/engagements');

app.use('/api/topics', topicRoutes);
app.use('/api/engagements', engagementRoutes);

// Mount routes
app.use('/api/posts', postsRouter);

// Basic route for testing
app.get('/', (req, res) => {
  console.log('Received request to root endpoint');
  res.json({ message: 'Welcome to the Blog Scheduler API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-scheduler');
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000
    };

    console.log('MongoDB connection options:', JSON.stringify(options, null, 2));

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-scheduler', options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Test database connection with a simple query
    try {
      const postCount = await Post.countDocuments();
      console.log(`Database connection test: Found ${postCount} posts in the database`);
      
      // Log a sample post if any exist
      if (postCount > 0) {
        const samplePost = await Post.findOne();
        console.log('Sample post from database:', JSON.stringify(samplePost, null, 2));
      }
    } catch (error) {
      console.error('Error testing database connection:', error);
    }

    // Handle connection errors after initial connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit the process, just log the error
    console.log('Will retry connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Connect to MongoDB
console.log('Initiating MongoDB connection...');
connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});