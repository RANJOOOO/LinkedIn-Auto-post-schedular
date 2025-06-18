const express = require('express');
const router = express.Router();
const engagementController = require('../controllers/engagementController');

// Check if profile exists
router.get('/profile/:profileUrl', engagementController.checkProfile);

// Save new profile
router.post('/profile', engagementController.saveProfile);

// Update connection status
router.patch('/profile/:profileUrl/connection', engagementController.updateConnectionStatus);

// Update follow-up status
router.patch('/profile/:profileUrl/followup', engagementController.updateFollowUpStatus);

// Delete all engagement data
router.delete('/all', engagementController.deleteAllEngagements);

module.exports = router; 