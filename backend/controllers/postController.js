const Post = require('../models/Post');
const mongoose = require('mongoose');

// Get all posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.title || !req.body.title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!req.body.content || !req.body.content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

  const post = new Post({
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      hashtags: req.body.hashtags || [],
    status: req.body.status || 'draft',
      scheduledTime: req.body.scheduledTime ? new Date(req.body.scheduledTime) : null
  });
    
    const newPost = await post.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors
    });
  }
};

// Get a post by ID
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Convert string ID to ObjectId if it's a valid ObjectId
    let queryId = postId;
    if (mongoose.Types.ObjectId.isValid(postId)) {
      queryId = new mongoose.Types.ObjectId(postId);
    }
    
    // Try to find the post
    let post = await Post.findById(queryId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Update fields
    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      post.title = req.body.title.trim();
    }
    if (req.body.content !== undefined) post.content = req.body.content;
    if (req.body.hashtags !== undefined) post.hashtags = req.body.hashtags;
    if (req.body.status !== undefined) post.status = req.body.status;
    
    // Handle scheduledTime and status together
    if (req.body.scheduledTime !== undefined) {
      // If scheduledTime is being set to null, set status to draft first
      if (!req.body.scheduledTime && post.status === 'scheduled') {
        post.status = 'draft';
      }
      post.scheduledTime = req.body.scheduledTime ? new Date(req.body.scheduledTime) : null;
    }
    
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors
    });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    let query = {};
    
    // Try to convert to ObjectId if possible
    if (mongoose.Types.ObjectId.isValid(postId)) {
      query._id = new mongoose.Types.ObjectId(postId);
    } else {
      query._id = postId; // Use as string
    }

    console.log('Attempting to delete post with query:', query);

    const post = await Post.findOneAndDelete(query);
    if (!post) {
      console.log('No post found with ID:', postId);
      return res.status(404).json({ 
        message: 'Post not found',
        details: `No post found with ID: ${postId}`
      });
    }
    
    console.log('Successfully deleted post:', post._id);
    res.json({ 
      message: 'Post deleted successfully',
      deletedPost: {
        id: post._id,
        title: post.title
      }
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      message: 'Error deleting post',
      details: error.message 
    });
  }
}; 