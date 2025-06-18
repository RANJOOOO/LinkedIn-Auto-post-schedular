const Post = require('./models/Post');
const WebSocketServer = require('./websocket');

class PostScheduler {
  constructor(websocketServer) {
    this.websocketServer = websocketServer;
    this.startScheduler();
  }

  startScheduler() {
    // Check for due posts every 5 minutes (300000 milliseconds)
    setInterval(async () => {
      try {
        const now = new Date();
        const duePosts = await Post.find({
          scheduledTime: { $lte: now },
          status: 'scheduled'
        });

        for (const post of duePosts) {
          // Notify all connected clients about the due post
          this.websocketServer.broadcast({
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
    }, 300000); // Check every 5 minutes
  }
}

module.exports = PostScheduler; 