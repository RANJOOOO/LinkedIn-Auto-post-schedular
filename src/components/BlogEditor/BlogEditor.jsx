import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Chip,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import createContentGenerationService from '../../services/contentGeneration';
import { API_CONFIG } from '../../config/api';

// Quill editor modules configuration
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

// Predefined categories
const categories = [
  'Technology',
  'Business',
  'Marketing',
  'Career',
  'Leadership',
  'Personal Development'
];

function BlogEditor({ title: initialTitle, initialContent, initialScheduleDate, onSave }) {
  const [title, setTitle] = useState(initialTitle || '');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [category, setCategory] = useState('');
  const [scheduleDate, setScheduleDate] = useState(
    initialScheduleDate ? new Date(initialScheduleDate) : null
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [outline, setOutline] = useState([]);
  const [keyPoints, setKeyPoints] = useState([]);
  const [stats, setStats] = useState([]);
  const quillRef = React.useRef(null);
  
  // Initialize content when component mounts or initialContent changes
  useEffect(() => {
    if (initialContent) {
      // If content contains newlines, format it for the editor
      if (initialContent.includes('\n')) {
        const formattedContent = initialContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line) // Remove empty lines
          .map(line => `<p>${line}</p>`)
          .join('');
        setContent(formattedContent);
      } else {
        setContent(initialContent);
      }
    }
  }, [initialContent]);

  const contentService = createContentGenerationService(
    API_CONFIG.useAI,
    API_CONFIG.apiKey
  );

  useEffect(() => {
    const generateContent = async () => {
      if (initialTitle) {
        try {
          const [outlineData, keyPointsData, statsData] = await Promise.all([
            contentService.generateOutline(initialTitle, 'how-to'),
            contentService.generateKeyPoints(initialTitle, 'how-to'),
            contentService.generateStats(initialTitle)
          ]);

          setOutline(outlineData);
          setKeyPoints(keyPointsData);
          setStats(statsData);
        } catch (error) {
          console.error('Error generating content:', error);
          // Handle error appropriately
        }
      }
    };

    generateContent();
  }, [initialTitle]);

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleSave = () => {
    // Validate required fields
    if (!title.trim()) {
      return;
    }

    // Convert HTML content to clean, formatted text
    const cleanContent = content
      .replace(/<p>/g, '')             // Remove opening p tags
      .replace(/<\/p>/g, '\n')         // Replace closing p tags with single newlines
      .replace(/<br\s*\/?>/g, '\n')    // Replace br tags with newlines
      .replace(/<div>/g, '')           // Remove div tags
      .replace(/<\/div>/g, '\n')       // Replace closing div tags with newlines
      .replace(/<[^>]*>/g, '')         // Remove any other HTML tags
      .replace(/\n\s*\n/g, '\n')       // Normalize multiple newlines to single newlines
      .replace(/\n{2,}/g, '\n')        // Limit consecutive newlines to single newline
      .trim();                         // Trim whitespace

    onSave({
      title: title.trim(),
      content: cleanContent,
      tags,
      category,
      scheduledTime: scheduleDate ? new Date(scheduleDate).toISOString() : null,
      status: scheduleDate ? 'scheduled' : 'draft'
    });
  };

  // Check if required fields are filled
  const isSaveDisabled = !title.trim() || !content.trim();

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Blog Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            required
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <Box sx={{ height: '300px', mb: '50px' }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              style={{ height: '100%' }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Post Settings
            </Typography>

            {/* Category Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tags Input */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Add Tags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                sx={{ mb: 1 }}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleDeleteTag(tag)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Schedule Date Picker */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Schedule Post (Optional)"
                value={scheduleDate}
                onChange={(newDate) => setScheduleDate(newDate)}
                renderInput={(params) => (
                  <TextField {...params} fullWidth sx={{ mb: 2 }} />
                )}
              />
            </LocalizationProvider>

            {/* Save and Preview Buttons */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={isSaveDisabled}
                fullWidth
              >
                Save Post
              </Button>
              <Button
                variant="outlined"
                onClick={handlePreview}
                disabled={isSaveDisabled}
                fullWidth
              >
                Preview
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </Box>
          {tags.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BlogEditor;