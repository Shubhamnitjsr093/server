const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Get all tasks (admin only)
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('project', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Get contractor's tasks
router.get('/assigned', auth, checkRole(['contractor']), async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Create new task
router.post('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { title, description, project, assignedTo, dueDate, priority } = req.body;
    
    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      dueDate,
      priority,
      status: 'pending'
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Get task by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name')
      .populate('assignedTo', 'firstName lastName email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    if (req.user.role === 'contractor' && task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to update this task
    if (req.user.role === 'contractor' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update task fields
    Object.keys(req.body).forEach(key => {
      task[key] = req.body[key];
    });

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// Update task status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to update this task
    if (req.user.role === 'contractor' && task.assignedTo.toString() !== req.user._id.toString()) {
    // Check if user has access to this task
    const project = await Project.findById(task.project);
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'contractor' && project.contractor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    task.notes.push({
      text: req.body.text,
      createdBy: req.user._id
    });
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error adding note', error: error.message });
  }
});

module.exports = router; 