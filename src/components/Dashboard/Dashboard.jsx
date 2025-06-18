import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import CalendarView from './CalendarView';
import { useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

// Status colors
const statusColors = {
  scheduled: 'primary',
  published: 'success',
  draft: 'default',
  failed: 'error',
};

function Dashboard({ posts: initialPosts, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(initialPosts || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('list');
  const [selectedPost, setSelectedPost] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Update posts when initialPosts changes
  useEffect(() => {
    setPosts(initialPosts || []);
  }, [initialPosts]);

  // Filter posts based on search and status
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      (post.title && post.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Edit
  const handleEdit = (post) => {
    // Navigate to editor with post data
    navigate('/editor', { 
      state: { 
        title: post.title,
        content: post.content,
        postId: post._id,
        isEditing: true,
        scheduledTime: post.scheduledTime ? new Date(post.scheduledTime) : null
      }
    });
  };

  // Handle Delete
  const handleDelete = async (post) => {
    try {
      // Validate post ID
      if (!post?._id || typeof post._id !== 'string' || post._id.length !== 24) {
        throw new Error('Invalid post ID format');
      }

      // Show confirmation dialog first
    setSelectedPost(post);
    setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error preparing delete:', error);
      setSnackbar({
        open: true,
        message: 'Invalid post data. Cannot delete.',
        severity: 'error'
      });
    }
  };

  // Confirm Delete
  const confirmDelete = async () => {
    try {
      if (!selectedPost?._id) {
        throw new Error('No post selected for deletion');
      }

      const response = await fetch(`http://localhost:5000/api/posts/${selectedPost._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete post');
      }

      // Update local state
      setPosts(posts.filter(p => p._id !== selectedPost._id));
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: data.message || 'Post deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete post. Please try again.',
        severity: 'error'
      });
    }
  };

  // Handle View
  const handleView = (post) => {
    setSelectedPost(post);
    setViewDialogOpen(true);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* View Toggle */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button 
          variant={view === 'list' ? 'contained' : 'outlined'} 
          onClick={() => setView('list')}
        >
          List View
        </Button>
        <Button 
          variant={view === 'calendar' ? 'contained' : 'outlined'} 
          onClick={() => setView('calendar')}
        >
          Calendar View
        </Button>
      </Box>

      {/* Main Content */}
      {view === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Schedule Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post._id}>
                  <TableCell>{post.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={post.status}
                      color={statusColors[post.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {post.scheduledTime ? new Date(post.scheduledTime).toLocaleString() : 'Not scheduled'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEdit(post)}
                        title="Edit Post"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(post)}
                        title="Delete Post"
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleView(post)}
                        title="View Post"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <CalendarView 
          posts={posts} 
          onEventClick={handleView} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{selectedPost?.title}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* View Post Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedPost?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography 
              component="pre" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 1.5
              }}
            >
              {selectedPost?.content}
            </Typography>
          </Box>
          {selectedPost?.tags?.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {selectedPost.tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              setViewDialogOpen(false);
              handleEdit(selectedPost);
            }}
            variant="contained"
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;