const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Apply authentication middleware to all report routes
router.use(authenticate);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports for the authenticated user
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter reports by company ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, finalized]
 *         description: Filter reports by status
 *     responses:
 *       200:
 *         description: List of reports
 *       401:
 *         description: Unauthorized
 */
router.get('/', reportController.getReports);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.get('/:id', reportController.getReport);

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - date
 *               - description
 *             properties:
 *               companyId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               contact:
 *                 type: string
 *               description:
 *                 type: string
 *               verification:
 *                 type: string
 *               observations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     observation:
 *                       type: string
 *                     riskLevel:
 *                       type: string
 *                       enum: [low, medium, high]
 *                     image:
 *                       type: string
 *                       format: binary
 *               recommendations:
 *                 type: string
 *               signature:
 *                 type: string
 *               visitConfirmation:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, finalized]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', upload.array('images'), reportController.createReport);

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: Update a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               contact:
 *                 type: string
 *               description:
 *                 type: string
 *               verification:
 *                 type: string
 *               observations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     observation:
 *                       type: string
 *                     riskLevel:
 *                       type: string
 *                       enum: [low, medium, high]
 *                     image:
 *                       type: string
 *                       format: binary
 *               recommendations:
 *                 type: string
 *               signature:
 *                 type: string
 *               visitConfirmation:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, finalized]
 *     responses:
 *       200:
 *         description: Report updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.put('/:id', upload.array('images'), reportController.updateReport);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.delete('/:id', reportController.deleteReport);

module.exports = router;