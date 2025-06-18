// Home.jsx
import React, { useState } from 'react';
import { Container, Typography, Box, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TopicInput from '../components/TopicInput/TopicInput';
import createContentGenerationService from '../services/contentGeneration';
import { API_CONFIG } from '../config/api';

function Home() {
  const [titles, setTitles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const contentService = createContentGenerationService(
    API_CONFIG.useAI,
    API_CONFIG.apiKey
  );

  const handleGenerate = async (topic) => {
    setIsGenerating(true);
    try {
      // For now, using mock data since we don't have GPT API
      const mockTitles = [
        { title: 'How to Master Blog Writing in 2024', type: 'How-to', engagement: 'High' },
        { title: 'The Ultimate Guide to Content Creation', type: 'Guide', engagement: 'Medium' },
        { title: '10 Tips for Better Blog Posts', type: 'List', engagement: 'High' }
      ];
      setTitles(mockTitles);
    } catch (error) {
      console.error('Error generating titles:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTitleSelect = (title) => {
    // Navigate to BlogEditor with the selected title
    navigate('/editor', { 
      state: { 
        title: title.title,
        // We'll add generated content here when we have GPT API
        content: 'This is a placeholder for the generated content. When GPT API is integrated, this will be replaced with AI-generated content.'
      }
    });
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Generate Blog Titles
      </Typography>
      <TopicInput onGenerate={handleGenerate} />
      
      {isGenerating ? (
        <Typography>Generating titles...</Typography>
      ) : (
        <Box sx={{ mt: 4 }}>
          {titles.map((title, index) => (
            <Card 
              key={index} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
              onClick={() => handleTitleSelect(title)}
            >
              <CardContent>
                <Typography variant="h6">{title.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {title.type} | Expected Engagement: {title.engagement}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}

export default Home;