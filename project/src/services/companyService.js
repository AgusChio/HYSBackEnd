const { supabaseClient } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Get all companies for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of companies
 */
const getCompanies = async (userId) => {
  const { data, error } = await supabaseClient
    .from('companies')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    throw new ApiError(400, error.message);
  }
  
  return data;
};

/**
 * Get a company by ID
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Company details
 */
const getCompany = async (companyId, userId) => {
  const { data, error } = await supabaseClient
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('user_id', userId)
    .single();
  
  if (error) {
    throw new ApiError(404, 'Company not found');
  }
  
  return data;
};

/**
 * Create a new company
 * @param {Object} companyData - Company data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created company
 */
const createCompany = async (companyData, userId) => {
  const { name, cuit, address, industry } = companyData;
  
  const newCompany = {
    name,
    cuit,
    address,
    industry,
    user_id: userId,
  };
  
  const { data, error } = await supabaseClient
    .from('companies')
    .insert(newCompany)
    .select()
    .single();
  
  if (error) {
    throw new ApiError(400, error.message);
  }
  
  return data;
};

/**
 * Update a company
 * @param {string} companyId - Company ID
 * @param {Object} companyData - Company data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated company
 */
const updateCompany = async (companyId, companyData, userId) => {
  // Verify company exists and belongs to user
  await getCompany(companyId, userId);
  
  const { name, cuit, address, industry } = companyData;
  
  const updates = {};
  if (name) updates.name = name;
  if (cuit) updates.cuit = cuit;
  if (address) updates.address = address;
  if (industry) updates.industry = industry;
  
  const { data, error } = await supabaseClient
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    throw new ApiError(400, error.message);
  }
  
  return data;
};

/**
 * Delete a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteCompany = async (companyId, userId) => {
  // Verify company exists and belongs to user
  await getCompany(companyId, userId);
  
  const { error } = await supabaseClient
    .from('companies')
    .delete()
    .eq('id', companyId)
    .eq('user_id', userId);
  
  if (error) {
    throw new ApiError(400, error.message);
  }
  
  return true;
};

module.exports = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
};