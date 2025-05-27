const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('../../src/routes/authRoutes');
const companyRoutes = require('../../src/routes/companyRoutes');
const reportRoutes = require('../../src/routes/reportRoutes');
const pdfRoutes = require('../../src/routes/pdfRoutes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/.netlify/functions/api/auth', authRoutes);
app.use('/.netlify/functions/api/companies', companyRoutes);
app.use('/.netlify/functions/api/reports', reportRoutes);
app.use('/.netlify/functions/api/pdf', pdfRoutes);

app.get('/.netlify/functions/api', (req, res) => {
  res.json({ 
    message: 'Health and Safety Reports API',
    version: '1.0.0'
  });
});

exports.handler = serverless(app);