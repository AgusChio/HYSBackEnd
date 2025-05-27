const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all PDF routes
router.use(authenticate);

/**
 * @swagger
 * /api/pdf/{reportId}:
 *   get:
 *     summary: Generate PDF for a report
 *     tags: [PDF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Report not found
 */
router.get('/:reportId', pdfController.generatePdf);

module.exports = router;