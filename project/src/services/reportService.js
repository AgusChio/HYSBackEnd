const { supabaseClient } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const imageUtils = require('../utils/imageUtils');

/**
 * Get all reports for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - List of reports
 */
const getReports = async (userId, filters = {}) => {
  // Start the query
  let query = supabaseClient
    .from('reports')
    .select(`
      *,
      companies (
        id,
        name,
        cuit,
        address,
        industry
      ),
      observations (
        id,
        observation,
        risk_level,
        image_url
      )
    `)
    .eq('user_id', userId);
  
  // Apply filters if provided
  if (filters.companyId) {
    query = query.eq('company_id', filters.companyId);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new ApiError(400, error.message);
  }
  
  return data;
};

/**
 * Get a report by ID
 * @param {string} reportId - Report ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Report details
 */
const getReport = async (reportId, userId) => {
  const { data, error } = await supabaseClient
    .from('reports')
    .select(`
      *,
      companies (
        id,
        name,
        cuit,
        address,
        industry
      ),
      observations (
        id,
        observation,
        risk_level,
        image_url
      )
    `)
    .eq('id', reportId)
    .eq('user_id', userId)
    .single();
  
  if (error) {
    throw new ApiError(404, 'Report not found');
  }
  
  return data;
};

/**
 * Create a new report
 * @param {Object} reportData - Report data
 * @param {Array} files - Uploaded files
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created report
 */
const createReport = async (reportData, files, userId) => {
  const {
    companyId,
    date,
    contact,
    description,
    verification,
    recommendations,
    signature,
    visitConfirmation,
    status = 'draft',
    observations = [],
  } = reportData;
  
  // Verify company exists and belongs to user
  const { data: company, error: companyError } = await supabaseClient
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('user_id', userId)
    .single();
  
  if (companyError || !company) {
    throw new ApiError(404, 'Company not found');
  }
  
  // Create report
  const newReport = {
    company_id: companyId,
    user_id: userId,
    date,
    contact: contact || '',
    description,
    verification: verification || '',
    recommendations: recommendations || '',
    signature: signature || '',
    visit_confirmation: visitConfirmation === 'true' || visitConfirmation === true,
    status,
  };
  
  const { data: reportData, error: reportError } = await supabaseClient
    .from('reports')
    .insert(newReport)
    .select()
    .single();
  
  if (reportError) {
    throw new ApiError(400, reportError.message);
  }
  
  // Process observations and upload images
  const parsedObservations = typeof observations === 'string'
    ? JSON.parse(observations)
    : observations;
    
  const observationPromises = parsedObservations.map(async (obs, index) => {
    let imageUrl = null;
    
    // Check if there's a corresponding image in the uploaded files
    if (files && files[index]) {
      const file = files[index];
      
      // Upload image to Supabase Storage
      imageUrl = await imageUtils.uploadImageFromPath(file.path, userId);
    }
    
    return {
      report_id: reportData.id,
      observation: obs.observation,
      risk_level: obs.riskLevel || 'low',
      image_url: imageUrl,
    };
  });
  
  const observationItems = await Promise.all(observationPromises);
  
  if (observationItems.length > 0) {
    const { error: obsError } = await supabaseClient
      .from('observations')
      .insert(observationItems);
    
    if (obsError) {
      throw new ApiError(400, obsError.message);
    }
  }
  
  // Get the full report with observations
  return getReport(reportData.id, userId);
};

/**
 * Update a report
 * @param {string} reportId - Report ID
 * @param {Object} reportData - Report data
 * @param {Array} files - Uploaded files
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated report
 */
const updateReport = async (reportId, reportData, files, userId) => {
  // Verify report exists and belongs to user
  await getReport(reportId, userId);
  
  const {
    date,
    contact,
    description,
    verification,
    recommendations,
    signature,
    visitConfirmation,
    status,
    observations = [],
  } = reportData;
  
  // Update report
  const updates = {};
  if (date) updates.date = date;
  if (contact !== undefined) updates.contact = contact;
  if (description) updates.description = description;
  if (verification !== undefined) updates.verification = verification;
  if (recommendations !== undefined) updates.recommendations = recommendations;
  if (signature !== undefined) updates.signature = signature;
  if (visitConfirmation !== undefined) {
    updates.visit_confirmation = visitConfirmation === 'true' || visitConfirmation === true;
  }
  if (status) updates.status = status;
  
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseClient
      .from('reports')
      .update(updates)
      .eq('id', reportId)
      .eq('user_id', userId);
    
    if (updateError) {
      throw new ApiError(400, updateError.message);
    }
  }
  
  // Process observations if provided
  if (observations && observations.length > 0) {
    const parsedObservations = typeof observations === 'string'
      ? JSON.parse(observations)
      : observations;
    
    // Get existing observations
    const { data: existingObs } = await supabaseClient
      .from('observations')
      .select('*')
      .eq('report_id', reportId);
    
    const existingObsMap = existingObs ? existingObs.reduce((acc, obs) => {
      acc[obs.id] = obs;
      return acc;
    }, {}) : {};
    
    // Process each observation
    for (const obs of parsedObservations) {
      // If this is an existing observation
      if (obs.id && existingObsMap[obs.id]) {
        let imageUrl = obs.imageUrl || existingObsMap[obs.id].image_url;
        
        // Only process new image if provided
        if (obs.newImage && files && files.length > 0) {
          const file = files.find(f => f.fieldname === `image_${obs.id}`);
          
          if (file) {
            // Upload new image
            imageUrl = await imageUtils.uploadImageFromPath(file.path, userId);
          }
        }
        
        // Update existing observation
        await supabaseClient
          .from('observations')
          .update({
            observation: obs.observation || existingObsMap[obs.id].observation,
            risk_level: obs.riskLevel || existingObsMap[obs.id].risk_level,
            image_url: imageUrl,
          })
          .eq('id', obs.id)
          .eq('report_id', reportId);
      } else {
        // This is a new observation
        let imageUrl = null;
        
        // Check if there's a corresponding image in the uploaded files
        if (files && files.length > 0) {
          const file = files.find(f => f.fieldname === `image_new_${obs.tempId || Date.now()}`);
          
          if (file) {
            // Upload image to Supabase Storage
            imageUrl = await imageUtils.uploadImageFromPath(file.path, userId);
          }
        }
        
        // Create new observation
        await supabaseClient
          .from('observations')
          .insert({
            report_id: reportId,
            observation: obs.observation,
            risk_level: obs.riskLevel || 'low',
            image_url: imageUrl,
          });
      }
    }
    
    // Handle deletions if specified
    if (reportData.observationsToDelete && reportData.observationsToDelete.length > 0) {
      const observationsToDelete = typeof reportData.observationsToDelete === 'string'
        ? JSON.parse(reportData.observationsToDelete)
        : reportData.observationsToDelete;
      
      for (const obsId of observationsToDelete) {
        if (existingObsMap[obsId]) {
          // Delete image if exists
          if (existingObsMap[obsId].image_url) {
            await imageUtils.deleteImage(existingObsMap[obsId].image_url);
          }
          
          // Delete observation
          await supabaseClient
            .from('observations')
            .delete()
            .eq('id', obsId)
            .eq('report_id', reportId);
        }
      }
    }
  }
  
  // Get the updated report
  return getReport(reportId, userId);
};

/**
 * Delete a report
 * @param {string} reportId - Report ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteReport = async (reportId, userId) => {
  // Get report with observations to delete their images
  const report = await getReport(reportId, userId);
  
  // Delete report (will cascade delete observations from DB)
  const { error: deleteError } = await supabaseClient
    .from('reports')
    .delete()
    .eq('id', reportId)
    .eq('user_id', userId);
  
  if (deleteError) {
    throw new ApiError(400, deleteError.message);
  }
  
  // Delete images from storage if any
  if (report.observations && report.observations.length > 0) {
    for (const obs of report.observations) {
      if (obs.image_url) {
        await imageUtils.deleteImage(obs.image_url);
      }
    }
  }
  
  return true;
};

module.exports = {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
};