const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const Project = require('../models/Project');
const Contract = require('../models/Contract');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Generate contract
router.post('/generate', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findById(projectId)
      .populate('client', 'firstName lastName email')
      .populate('contractor', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create contract document
    const doc = new PDFDocument();
    const contractPath = path.join(__dirname, '../contracts', `${projectId}.pdf`);
    
    // Ensure contracts directory exists
    if (!fs.existsSync(path.join(__dirname, '../contracts'))) {
      fs.mkdirSync(path.join(__dirname, '../contracts'));
    }

    // Pipe the PDF to a file
    doc.pipe(fs.createWriteStream(contractPath));

    // Add content to the PDF
    doc.fontSize(20).text('Project Contract', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${project.title}`);
    doc.text(`Client: ${project.client.firstName} ${project.client.lastName}`);
    doc.text(`Contractor: ${project.contractor.firstName} ${project.contractor.lastName}`);
    doc.moveDown();
    doc.text(`Amount: ${project.pricing.amount} ${project.pricing.currency}`);
    doc.moveDown();
    doc.text('Terms and Conditions:');
    doc.text(project.pricing.notes || 'Standard terms and conditions apply.');
    
    // Finalize the PDF
    doc.end();

    // Create contract record
    const contract = new Contract({
      project: projectId,
      filePath: contractPath,
      status: 'pending',
      client: project.client._id,
      contractor: project.contractor._id
    });

    await contract.save();

    // Update project with contract reference
    project.contract = contract._id;
    await project.save();

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: 'Error generating contract', error: error.message });
  }
});

// Get contract status
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

    const contract = await Contract.findOne({ project: req.params.projectId });
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contract', error: error.message });
  }
});

// Update contract status (e.g., when signed)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user has access to this contract
    if (req.user.role === 'client' && contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'contractor' && contract.contractor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    contract.status = status;
    await contract.save();

    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: 'Error updating contract status', error: error.message });
  }
});

// Download contract
router.get('/:id/download', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user has access to this contract
    if (req.user.role === 'client' && contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'contractor' && contract.contractor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.download(contract.filePath);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading contract', error: error.message });
  }
});

module.exports = router; 