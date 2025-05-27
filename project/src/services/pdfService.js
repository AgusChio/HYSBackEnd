const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Generate HTML template for PDF
 * @param {Object} report - Report data
 * @returns {string} - HTML content
 */
const generateHtmlTemplate = (report) => {
  const companyName = report.companies?.name || 'N/A';
  const date = new Date(report.date).toLocaleDateString();
  
  // Format observations
  const observationsHtml = report.observations?.map(obs => {
    const riskLevelClass = {
      low: 'risk-low',
      medium: 'risk-medium',
      high: 'risk-high'
    }[obs.risk_level] || 'risk-low';
    
    return `
      <div class="observation">
        <div class="observation-header">
          <h4>Observation</h4>
          <span class="risk-level ${riskLevelClass}">${obs.risk_level.toUpperCase()}</span>
        </div>
        <p>${obs.observation}</p>
        ${obs.image_url ? `<img src="${obs.image_url}" alt="Observation image" class="observation-image" />` : ''}
      </div>
    `;
  }).join('') || '<p>No observations recorded</p>';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Health and Safety Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 10px;
          border-bottom: 2px solid #3366cc;
        }
        h1 {
          color: #3366cc;
          margin-bottom: 5px;
        }
        .report-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .report-meta div {
          flex: 1;
        }
        .section {
          margin-bottom: 30px;
        }
        h2 {
          color: #3366cc;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        h3 {
          color: #444;
        }
        .observation {
          background-color: #f9f9f9;
          border-left: 4px solid #ddd;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 0 5px 5px 0;
        }
        .observation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .observation-header h4 {
          margin: 0;
        }
        .risk-level {
          padding: 5px 10px;
          border-radius: 3px;
          font-weight: bold;
          font-size: 0.8em;
        }
        .risk-low {
          background-color: #dff0d8;
          color: #3c763d;
        }
        .risk-medium {
          background-color: #fcf8e3;
          color: #8a6d3b;
        }
        .risk-high {
          background-color: #f2dede;
          color: #a94442;
        }
        .observation-image {
          max-width: 100%;
          margin-top: 10px;
          border: 1px solid #ddd;
        }
        .signature {
          margin-top: 40px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          text-align: right;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 0.9em;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>Health and Safety Report</h1>
          <p>Company: ${companyName}</p>
        </header>
        
        <div class="report-meta">
          <div>
            <strong>Date:</strong> ${date}<br>
            <strong>Contact:</strong> ${report.contact || 'N/A'}<br>
            <strong>Status:</strong> ${report.status.toUpperCase()}<br>
          </div>
          <div>
            <strong>Visit Confirmation:</strong> ${report.visit_confirmation ? 'Confirmed' : 'Not confirmed'}<br>
          </div>
        </div>
        
        <div class="section">
          <h2>Description</h2>
          <p>${report.description}</p>
        </div>
        
        <div class="section">
          <h2>Verification</h2>
          <p>${report.verification || 'No verification details provided'}</p>
        </div>
        
        <div class="section">
          <h2>Observations and Improvement Opportunities</h2>
          ${observationsHtml}
        </div>
        
        <div class="section">
          <h2>Recommendations</h2>
          <p>${report.recommendations || 'No recommendations provided'}</p>
        </div>
        
        <div class="signature">
          <p>Professional Signature: ${report.signature || 'Not signed'}</p>
        </div>
        
        <div class="footer">
          <p>This report was generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate PDF for a report
 * @param {Object} report - Report data
 * @returns {Promise<string>} - Path to generated PDF
 */
const generatePdf = (report) => {
  return new Promise((resolve, reject) => {
    try {
      // Generate HTML content
      const htmlContent = generateHtmlTemplate(report);
      
      // PDF options
      const options = {
        format: 'A4',
        border: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        timeout: 30000,
      };
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Generate filename
      const fileName = `report_${report.id}_${Date.now()}.pdf`;
      const filePath = path.join(tempDir, fileName);
      
      // Generate PDF
      pdf.create(htmlContent, options).toFile(filePath, (err, result) => {
        if (err) {
          return reject(new ApiError(500, 'Error generating PDF'));
        }
        
        resolve(filePath);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePdf,
};