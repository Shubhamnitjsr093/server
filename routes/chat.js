const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Chat = require('../models/Chat');
const Project = require('../models/Project');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get chat for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'contractor' && project.contractor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let chat = await Chat.findOne({ project: req.params.projectId })
      .populate('messages.sender', 'firstName lastName email')
      .populate('participants', 'firstName lastName email');

    if (!chat) {
      // Create new chat if it doesn't exist
      chat = new Chat({
        project: req.params.projectId,
        participants: [project.client, project.contractor]
      });
      await chat.save();
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat', error: error.message });
  }
});

// Send message
router.post('/project/:projectId/message', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'contractor' && project.contractor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let chat = await Chat.findOne({ project: req.params.projectId });
    if (!chat) {
      chat = new Chat({
        project: req.params.projectId,
        participants: [project.client, project.contractor]
      });
    }

    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      type: file.mimetype
    })) : [];

    const message = {
      sender: req.user._id,
      content: req.body.content,
      attachments
    };

    chat.messages.push(message);
    await chat.save();

    // Populate sender information
    await chat.populate('messages.sender', 'firstName lastName email');

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// Flag message
router.post('/message/:messageId/flag', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 'messages._id': req.params.messageId });
    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isFlagged = true;
    message.flaggedBy = req.user._id;
    message.flaggedReason = req.body.reason;

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error flagging message', error: error.message });
  }
});

module.exports = router; 