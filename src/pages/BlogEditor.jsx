// BlogEditor.jsx
import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import BlogEditor from '../components/BlogEditor/BlogEditor';
import { createPost, updatePost } from '../services/api';

function BlogEditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { title, content, postId, isEditing, scheduledTime } = location.state || {};

  const handleSave = async (blog) => {
    try {
      // Ensure all required fields are present
      if (!blog.title || !blog.content) {
        throw new Error('Title and content are required');
      }

      const postData = {
        title: blog.title,
        content: blog.content, // Keep the HTML content as is
        hashtags: blog.tags || [],
        status: blog.status || (blog.scheduledTime ? 'scheduled' : 'draft'),
        scheduledTime: blog.scheduledTime || null
      };
      
      if (isEditing && postId) {
        console.log('Updating post:', postId);
        await updatePost(postId, postData);
      } else {
        console.log('Creating new post');
        await createPost(postData);
      }
      
      // Navigate to dashboard after successful save
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving blog:', error);
      console.error('Error details:', error.response?.data);
      // Handle error appropriately
    }
  };

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditing ? 'Edit Blog Post' : 'Create Blog Post'}
        </Typography>
        <BlogEditor 
          title={title}
          initialContent={content}
          initialScheduleDate={scheduledTime}
          onSave={handleSave}
        />
      </Box>
    </Container>
  );
}

export default BlogEditorPage;