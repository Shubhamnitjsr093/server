const express = require('express');
const router = express.Router();
const questionnaire = require('../models/Questionnaire');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   POST api/services/submit-questionnaire
// @desc    Submit a service questionnaire
// @access  Private
router.post(
    '/submit-questionnaire',
    auth,
    [
        check('serviceId', 'Service ID is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('phone', 'Phone number is required').not().isEmpty(),
        check('company', 'Company name is required').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { serviceId, email,  questionnaire } = req.body;

            // Create new service request
            const serviceRequest = new Questionnaire({
                user: req.user.id,
                serviceId,
                email,
                questionnaire,
                status: 'pending'
            });

            await serviceRequest.save();

            res.json(serviceRequest);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   GET api/services/my-requests
// @desc    Get all service requests for the logged-in user
// @access  Private
router.get('/my-requests', auth, async (req, res) => {
    try {
        const serviceRequests = await questionnaire.find({ user: req.user.id })
            .sort({ date: -1 });
        res.json(serviceRequests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/services/:id
// @desc    Get service request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const serviceRequest = await questionnaire.findById(req.params.id);

        if (!serviceRequest) {
            return res.status(404).json({ msg: 'Service request not found' });
        }

        // Check if user is authorized to view this request
        if (serviceRequest.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        res.json(serviceRequest);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Service request not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/:id/update-status
// @desc    Update service request status
// @access  Private
router.put(
    '/:id/update-status',
    [
        auth,
        [
            check('status', 'Status is required').not().isEmpty(),
            check('price', 'Price is required').isNumeric()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const serviceRequest = await questionnaire.findById(req.params.id);

            if (!serviceRequest) {
                return res.status(404).json({ msg: 'Service request not found' });
            }

            // Check if user is authorized to update this request
            if (serviceRequest.user.toString() !== req.user.id) {
                return res.status(401).json({ msg: 'User not authorized' });
            }

            const { status, price } = req.body;

            serviceRequest.status = status;
            serviceRequest.price = price;

            await serviceRequest.save();

            res.json(serviceRequest);
        } catch (err) {
            console.error(err.message);
            if (err.kind === 'ObjectId') {
                return res.status(404).json({ msg: 'Service request not found' });
            }
            res.status(500).send('Server Error');
        }
    }
);

module.exports = router; 