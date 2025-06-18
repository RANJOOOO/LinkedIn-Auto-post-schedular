// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard/Dashboard';
import { getPosts, deletePost, updatePost } from '../services/api';

function DashboardPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await getPosts();
      setPosts(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (post) => {
    try {
      // Always navigate to editor for editing
      navigate('/editor', {
        state: {
          title: post.title,
          content: post.content,
          postId: post._id,
          isEditing: true,
          scheduledTime: post.scheduledTime
        }
      });
    } catch (err) {
      console.error('Error updating post:', err);
      setError('Failed to update post. Please try again.');
    }
  };

  const handleDelete = async (post) => {
    try {
      await deletePost(post._id);
      // Remove the deleted post from the local state
      setPosts(posts.filter(p => p._id !== post._id));
      setError(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography>Loading posts...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Your Blog Posts
        </Typography>
        <Dashboard 
          posts={posts}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Box>
    </Container>
  );
}

export default DashboardPage;