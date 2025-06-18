import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

function CalendarView({ posts, onEventClick }) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'month'

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekDayHeaders = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => (
      <Grid item xs key={day}>
        <Box
          sx={{
            p: 1,
            textAlign: 'center',
            bgcolor: theme.palette.primary.main,
            color: 'white',
            borderRadius: '4px 4px 0 0'
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
          {day}
        </Typography>
        </Box>
      </Grid>
    ));
  };

  const getMonthDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalCells = 42; // 6 rows * 7 days
    const cells = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      cells.push({ type: 'empty', key: `empty-start-${i}` });
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ type: 'date', day, key: `day-${day}` });
    }

    // Add empty cells for remaining days to complete the grid
    while (cells.length < totalCells) {
      cells.push({ type: 'empty', key: `empty-end-${cells.length}` });
    }

    // Now, render as 6 rows of 7 days
    const rows = [];
    for (let week = 0; week < 6; week++) {
      rows.push(
        <Grid container key={`week-${week}`} spacing={1}>
          {cells.slice(week * 7, week * 7 + 7).map(cell => {
            if (cell.type === 'empty') {
              return (
                <Grid item xs key={cell.key}>
                  <Box
                    sx={{
                      border: '1px solid #e0e0e0',
                      minHeight: '100px',
                      bgcolor: 'rgba(0, 0, 0, 0.02)',
                      opacity: 0.5
                    }}
                  />
                </Grid>
              );
            } else {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), cell.day);
              const isToday = new Date().toDateString() === date.toDateString();
              const dayPosts = posts.filter(post => {
                const postDate = new Date(post.scheduledTime);
                return postDate.getDate() === cell.day &&
                       postDate.getMonth() === currentDate.getMonth() &&
                       postDate.getFullYear() === currentDate.getFullYear();
              });
              return (
                <Grid item xs key={cell.key}>
                  <Box
                    sx={{
                      border: '2px solid #1976d2',
                      minHeight: '100px',
                      position: 'relative',
                      bgcolor: isToday ? 'rgba(25, 118, 210, 0.08)' : 'white',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)'
                      },
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)'
                    }}
                  >
                    <Box
                      sx={{
                        p: 0.5,
                        borderBottom: '1px solid #e0e0e0',
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isToday ? 'bold' : 'normal',
                          color: isToday ? 'primary.main' : 'text.primary',
                          fontSize: '0.9rem'
                        }}
                      >
                        {cell.day}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1 }}>
                      {dayPosts.map(post => (
                        <Tooltip key={post._id} title={post.title}>
                          <Box
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              color: 'white',
                              p: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              mb: 0.5,
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              '&:hover': {
                                bgcolor: theme.palette.primary.dark
                              }
                            }}
                            onClick={() => onEventClick(post)}
                          >
                            {post.title}
                          </Box>
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                </Grid>
              );
            }
          })}
        </Grid>
      );
    }
    return rows;
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const isToday = new Date().toDateString() === date.toDateString();
      
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.scheduledTime);
        return postDate.getDate() === date.getDate() &&
               postDate.getMonth() === date.getMonth() &&
               postDate.getFullYear() === date.getFullYear();
      });

      days.push(
        <Grid item xs key={i}>
          <Box
            sx={{
              border: '2px solid #1976d2',
              minHeight: '150px',
              position: 'relative',
              bgcolor: isToday ? 'rgba(25, 118, 210, 0.08)' : 'white',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)'
              },
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
            }}
          >
            <Box
              sx={{
                p: 0.5,
                borderBottom: '1px solid #e0e0e0',
                bgcolor: 'rgba(0, 0, 0, 0.02)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Typography 
                variant="subtitle2"
                sx={{ 
                  fontWeight: isToday ? 'bold' : 'normal',
                  color: isToday ? 'primary.main' : 'text.primary'
                }}
              >
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Typography>
            </Box>
            <Box sx={{ p: 1 }}>
            {dayPosts.map(post => (
                <Tooltip key={post._id} title={post.title}>
                <Box
                  sx={{
                      bgcolor: theme.palette.primary.main,
                    color: 'white',
                    p: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    mb: 0.5,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark
                      }
                  }}
                  onClick={() => onEventClick(post)}
                >
                  {post.title}
                </Box>
              </Tooltip>
            ))}
            </Box>
          </Box>
        </Grid>
      );
    }

    return days;
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setDate(currentDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else {
      newDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mt: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderRadius: 2
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 3,
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          pb: 2
        }}
      >
        <Box>
          <Button
            variant={view === 'month' ? 'contained' : 'outlined'}
            onClick={() => setView('month')}
            sx={{ 
              mr: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'contained' : 'outlined'}
            onClick={() => setView('week')}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            Week
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={handlePrevious}
            sx={{ 
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.08)' }
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography 
            variant="h6" 
            sx={{ 
              mx: 2,
              fontWeight: 'bold',
              color: 'text.primary'
            }}
          >
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </Typography>
          <IconButton 
            onClick={handleNext}
            sx={{ 
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.08)' }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={1}>
        {view === 'month' && (
          <>
            {getWeekDayHeaders()}
            <Grid item xs={12} sx={{ mb: 1 }} />
          </>
        )}
        {view === 'month' ? getMonthDays() : getWeekDays()}
      </Grid>
    </Paper>
  );
}

export default CalendarView;