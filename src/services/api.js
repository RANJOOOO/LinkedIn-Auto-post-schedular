// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Topic API calls
export const getTopics = () => api.get('/topics');
export const createTopic = (data) => api.post('/topics', data);
export const getTopicById = (id) => api.get(`/topics/${id}`);
export const updateTopic = (id, data) => api.put(`/topics/${id}`, data);
export const deleteTopic = (id) => api.delete(`/topics/${id}`);

// Post API calls
export const getPosts = () => api.get('/posts');
export const createPost = (data) => api.post('/posts', data);
export const getPostById = (id) => api.get(`/posts/${id}`);
export const updatePost = (id, data) => api.put(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);

export default api;