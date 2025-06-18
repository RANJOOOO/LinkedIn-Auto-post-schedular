const Topic = require('../models/Topic');

// Get all topics
exports.getTopics = async (req, res) => {
  try {
    const topics = await Topic.find();
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new topic
exports.createTopic = async (req, res) => {
  const topic = new Topic({
    name: req.body.name,
    description: req.body.description
  });
  try {
    const newTopic = await topic.save();
    res.status(201).json(newTopic);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get a topic by ID
exports.getTopicById = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a topic
exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    topic.name = req.body.name || topic.name;
    topic.description = req.body.description || topic.description;
    const updatedTopic = await topic.save();
    res.json(updatedTopic);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    await topic.remove();
    res.json({ message: 'Topic deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 