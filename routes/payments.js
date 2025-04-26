const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Project = require('../models/Project');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: project.pricing.amount * 100, // Convert to cents
      currency: project.pricing.currency || 'usd',
      metadata: {
        projectId: project._id.toString(),
        clientId: project.client.toString()
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: 'Error creating payment intent', error: error.message });
  }
});

// Handle successful payment
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { projectId } = paymentIntent.metadata;

    try {
      // Update project status
      await Project.findByIdAndUpdate(projectId, {
        paymentStatus: 'paid',
        status: 'in_progress'
      });
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  }

  res.json({ received: true });
});

// Get payment status
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

    res.json({
      paymentStatus: project.paymentStatus,
      amount: project.pricing.amount,
      currency: project.pricing.currency
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment status', error: error.message });
  }
});

module.exports = router; 