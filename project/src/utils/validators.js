const Joi = require('joi');

/**
 * Validate company data
 * @param {Object} data - Company data to validate
 * @returns {Object} - Validation result
 */
const validateCompany = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2).max(100),
    cuit: Joi.string().required().pattern(/^[0-9-]+$/),
    address: Joi.string().required().min(5),
    industry: Joi.string().required(),
  });
  
  return schema.validate(data);
};

/**
 * Validate report data
 * @param {Object} data - Report data to validate
 * @returns {Object} - Validation result
 */
const validateReport = (data) => {
  const schema = Joi.object({
    companyId: Joi.string().required(),
    date: Joi.date().required(),
    contact: Joi.string().allow('', null),
    description: Joi.string().required().min(10),
    verification: Joi.string().allow('', null),
    recommendations: Joi.string().allow('', null),
    signature: Joi.string().allow('', null),
    visitConfirmation: Joi.boolean().default(false),
    status: Joi.string().valid('draft', 'finalized').default('draft'),
    observations: Joi.array().items(
      Joi.object({
        observation: Joi.string().required(),
        riskLevel: Joi.string().valid('low', 'medium', 'high').default('low'),
        imageUrl: Joi.string().allow('', null),
      })
    ),
  });
  
  return schema.validate(data);
};

/**
 * Validate user registration data
 * @param {Object} data - Registration data to validate
 * @returns {Object} - Validation result
 */
const validateRegistration = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).required(),
  });
  
  return schema.validate(data);
};

/**
 * Validate user login data
 * @param {Object} data - Login data to validate
 * @returns {Object} - Validation result
 */
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  
  return schema.validate(data);
};

module.exports = {
  validateCompany,
  validateReport,
  validateRegistration,
  validateLogin,
};