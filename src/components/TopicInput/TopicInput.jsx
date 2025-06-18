import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

function TopicInput({ onGenerate }) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      onGenerate(topic);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Enter a topic"
        variant="outlined"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Button 
        variant="contained" 
        type="submit"
        disabled={!topic.trim()}
      >
        Generate Titles
      </Button>
    </Box>
  );
}

export default TopicInput;