const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { auth, checkRole } = require('../middleware/auth');

// Get all projects (admin only)
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('client', 'firstName lastName email')
      .populate('contractor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
});

// Get client's projects
router.get('/client', auth, checkRole(['client']), async (req, res) => {
  try {
    const projects = await Project.find({ client: req.user._id })
      .populate('contractor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
});

// Get contractor's assigned projects
router.get('/assigned', auth, checkRole(['contractor']), async (req, res) => {
  try {
    const projects = await Project.find({ contractor: req.user._id })
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
});

// Create new project
router.post('/', auth, checkRole(['client']), async (req, res) => {
  try {
    const { name, description, serviceType, requirements } = req.body;
    
    const project = new Project({
      name,
      description,
      serviceType,
      requirements,
      client: req.user._id,
      status: 'pending_review'
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
});

// Get project by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'firstName lastName email')
      .populate('contractor', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'contractor' && project.contractor?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to update this project
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'contractor' && project.contractor?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update project fields
    Object.keys(req.body).forEach(key => {
      project[key] = req.body[key];
    });

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
});

// Assign contractor to project (admin only)
router.put('/:id/assign', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { contractorId } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.contractor = contractorId;
    project.status = 'in_progress';
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error assigning contractor', error: error.message });
  }
});

module.exports = router; 