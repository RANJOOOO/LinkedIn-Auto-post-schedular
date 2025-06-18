const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const Post = require('../models/Post');

// Create a test post
router.post('/test', async (req, res) => {
  try {
    const testPost = new Post({
      title: 'Test Post',
      content: 'This is a test post',
      hashtags: ['test', 'sample'],
      scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
      status: 'scheduled'
    });

    const savedPost = await testPost.save();
    console.log('Test post created:', JSON.stringify(savedPost, null, 2));
    res.json(savedPost);
  } catch (error) {
    console.error('Error creating test post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ scheduledTime: 1 });
    console.log('Retrieved posts:', JSON.stringify(posts, null, 2));
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', postController.createPost);
router.get('/:id', postController.getPostById);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);

module.exports = router; 