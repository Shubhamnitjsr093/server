const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

// Get overall statistics
router.get('/overview', auth, checkRole(['admin']), async (req, res) => {
  try {
    const [
      totalProjects,
      totalTasks,
      totalUsers,
      activeProjects,
      completedProjects,
      pendingTasks,
      completedTasks
    ] = await Promise.all([
      Project.countDocuments(),
      Task.countDocuments(),
      User.countDocuments(),
      Project.countDocuments({ status: 'in_progress' }),
      Project.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'completed' })
    ]);

    res.json({
      totalProjects,
      totalTasks,
      totalUsers,
      activeProjects,
      completedProjects,
      pendingTasks,
      completedTasks
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// Get project statistics by status
router.get('/projects/status', auth, checkRole(['admin']), async (req, res) => {
  try {
    const stats = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project statistics', error: error.message });
  }
});

// Get task statistics by status
router.get('/tasks/status', auth, checkRole(['admin']), async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task statistics', error: error.message });
  }
});

// Get user statistics by role
router.get('/users/role', auth, checkRole(['admin']), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user statistics', error: error.message });
  }
});

// Get recent activities
router.get('/activities', auth, checkRole(['admin']), async (req, res) => {
  try {
    const recentProjects = await Project.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('client', 'firstName lastName')
      .populate('contractor', 'firstName lastName');

    const recentTasks = await Task.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('project', 'name')
      .populate('assignedTo', 'firstName lastName');

    res.json({
      recentProjects,
      recentTasks
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent activities', error: error.message });
  }
});

module.exports = router; 