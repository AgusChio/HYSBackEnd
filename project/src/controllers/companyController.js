const { supabaseClient } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Get all companies for the authenticated user
 */
const getCompanies = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabaseClient
      .from('companies')
      .select(`
        *,
        user_companies!inner (
          user_id
        )
      `)
      .eq('user_companies.user_id', userId);
    
    if (error) {
      throw new ApiError(400, error.message);
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a company by ID
 */
const getCompany = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user.id;
    
    const { data, error } = await supabaseClient
      .from('companies')
      .select(`
        *,
        user_companies!inner (
          user_id
        )
      `)
      .eq('id', companyId)
      .eq('user_companies.user_id', userId)
      .single();
    
    if (error) {
      throw new ApiError(404, 'Company not found');
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new company or associate with existing one
 */
const createCompany = async (req, res, next) => {
  try {
    const { name, cuit, address, industry } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!name || !cuit || !address || !industry) {
      throw new ApiError(400, 'Name, CUIT, address, and industry are required');
    }
    
    // Start a transaction
    const { data: existingCompany, error: searchError } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('cuit', cuit)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new ApiError(400, searchError.message);
    }
    
    let company;
    
    if (existingCompany) {
      // Company exists, just create the association
      company = existingCompany;
    } else {
      // Create new company
      const { data: newCompany, error: createError } = await supabaseClient
        .from('companies')
        .insert({
          name,
          cuit,
          address,
          industry,
        })
        .select()
        .single();
      
      if (createError) {
        throw new ApiError(400, createError.message);
      }
      
      company = newCompany;
    }
    
    // Create user-company association
    const { error: associationError } = await supabaseClient
      .from('user_companies')
      .insert({
        user_id: userId,
        company_id: company.id,
      });
    
    if (associationError) {
      throw new ApiError(400, associationError.message);
    }
    
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a company
 */
const updateCompany = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user.id;
    const { name, cuit, address, industry } = req.body;
    
    // Verify company exists and user has access
    const { data: existingCompany, error: fetchError } = await supabaseClient
      .from('companies')
      .select(`
        *,
        user_companies!inner (
          user_id
        )
      `)
      .eq('id', companyId)
      .eq('user_companies.user_id', userId)
      .single();
    
    if (fetchError || !existingCompany) {
      throw new ApiError(404, 'Company not found');
    }
    
    // Update company
    const updates = {};
    if (name) updates.name = name;
    if (cuit) updates.cuit = cuit;
    if (address) updates.address = address;
    if (industry) updates.industry = industry;
    
    const { data, error } = await supabaseClient
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single();
    
    if (error) {
      throw new ApiError(400, error.message);
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove user's association with a company
 */
const removeCompanyAssociation = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user.id;
    
    // Remove association
    const { error } = await supabaseClient
      .from('user_companies')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId);
    
    if (error) {
      throw new ApiError(400, error.message);
    }
    
    res.json({ message: 'Company association removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  removeCompanyAssociation,
};