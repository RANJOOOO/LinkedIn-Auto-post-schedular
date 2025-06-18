const Engagement = require('../models/Engagement');

// Check if profile exists and get its status
exports.checkProfile = async (req, res) => {
  try {
    const { profileUrl } = req.params;
    const profile = await Engagement.findOne({ profileUrl });
    
    if (!profile) {
      return res.json({ 
        exists: false 
      });
    }

    return res.json({
      exists: true,
      connectionSent: profile.connectionSent,
      followUpSent: profile.followUpSent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Save new profile
exports.saveProfile = async (req, res) => {
  try {
    const { profileUrl, name } = req.body;
    
    const profile = new Engagement({
      profileUrl,
      name
    });

    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update connection status
exports.updateConnectionStatus = async (req, res) => {
  try {
    const { profileUrl } = req.params;
    const profile = await Engagement.findOneAndUpdate(
      { profileUrl },
      { connectionSent: true },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update follow-up status
exports.updateFollowUpStatus = async (req, res) => {
  try {
    const { profileUrl } = req.params;
    const profile = await Engagement.findOneAndUpdate(
      { profileUrl },
      { followUpSent: true },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete all engagement data
exports.deleteAllEngagements = async (req, res) => {
  try {
    // Delete all documents from the Engagement collection
    const result = await Engagement.deleteMany({});
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} engagement records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}; 