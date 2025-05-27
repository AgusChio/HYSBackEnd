const { ApiError } = require('./errorHandler');
const validators = require('../utils/validators');

/**
 * Middleware to validate request body against a schema
 * @param {string} schema - Name of the schema to validate against
 * @returns {Function} - Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Select the appropriate validator
      let validator;
      switch (schema) {
        case 'company':
          validator = validators.validateCompany;
          break;
        case 'report':
          validator = validators.validateReport;
          break;
        case 'registration':
          validator = validators.validateRegistration;
          break;
        case 'login':
          validator = validators.validateLogin;
          break;
        default:
          throw new ApiError(500, 'Invalid schema specified');
      }
      
      // Validate the request body
      const { error } = validator(req.body);
      
      if (error) {
        throw new ApiError(400, error.details[0].message);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validate,
};