const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { supabaseClient } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Get all reports for the authenticated user
 */
const getReports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { companyId, status } = req.query;
    
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
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new ApiError(400, error.message);
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a report by ID
 */
const getReport = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    
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
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload an image to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} userId - User ID
 * @returns {Promise<string>} - URL of the uploaded image
 */
const uploadImage = async (fileBuffer, fileName, userId) => {
  try {
    const fileExt = fileName.split('.').pop();
    const filePath = `${userId}/${uuidv4()}.${fileExt}`;
    
    const { error } = await supabaseClient.storage
      .from('report-images')
      .upload(filePath, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
    
    // Get public URL
    const { data } = supabaseClient.storage
      .from('report-images')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

/**
 * Create a new report
 */
const createReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
    } = req.body;
    
    // Parse observations from JSON string if needed
    let observations = [];
    if (req.body.observations) {
      observations = typeof req.body.observations === 'string'
        ? JSON.parse(req.body.observations)
        : req.body.observations;
    }
    
    // Validate required fields
    if (!companyId || !date || !description) {
      throw new ApiError(400, 'Company ID, date, and description are required');
    }
    
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
    const observationPromises = observations.map(async (obs, index) => {
      let imageUrl = null;
      
      // Check if there's a corresponding image in the uploaded files
      if (req.files && req.files[index]) {
        const file = req.files[index];
        const fileBuffer = fs.readFileSync(file.path);
        
        // Upload image to Supabase Storage
        imageUrl = await uploadImage(fileBuffer, file.originalname, userId);
        
        // Clean up temporary file
        fs.unlinkSync(file.path);
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
    
    res.status(201).json({
      ...reportData,
      observations: observationItems,
    });
  } catch (error) {
    // Clean up any temporary files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    next(error);
  }
};

/**
 * Update a report
 */
const updateReport = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    const {
      date,
      contact,
      description,
      verification,
      recommendations,
      signature,
      visitConfirmation,
      status,
    } = req.body;
    
    // Parse observations from JSON string if needed
    let observations = [];
    if (req.body.observations) {
      observations = typeof req.body.observations === 'string'
        ? JSON.parse(req.body.observations)
        : req.body.observations;
    }
    
    // Verify report exists and belongs to user
    const { data: existingReport, error: reportError } = await supabaseClient
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
    
    if (reportError || !existingReport) {
      throw new ApiError(404, 'Report not found');
    }
    
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
    
    const { data: updatedReport, error: updateError } = await supabaseClient
      .from('reports')
      .update(updates)
      .eq('id', reportId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      throw new ApiError(400, updateError.message);
    }
    
    // Process observations if provided
    if (observations && observations.length > 0) {
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
      const observationPromises = observations.map(async (obs) => {
        let imageUrl = obs.imageUrl || null;
        
        // If this is an existing observation
        if (obs.id && existingObsMap[obs.id]) {
          // Only process new image if provided
          if (obs.newImage && req.files && req.files.length > 0) {
            const file = req.files.find(f => f.fieldname === `image_${obs.id}`);
            
            if (file) {
              const fileBuffer = fs.readFileSync(file.path);
              
              // Upload new image
              imageUrl = await uploadImage(fileBuffer, file.originalname, userId);
              
              // Clean up temporary file
              fs.unlinkSync(file.path);
            }
          }
          
          // Update existing observation
          return {
            id: obs.id,
            observation: obs.observation || existingObsMap[obs.id].observation,
            risk_level: obs.riskLevel || existingObsMap[obs.id].risk_level,
            image_url: imageUrl || existingObsMap[obs.id].image_url,
          };
        } else {
          // This is a new observation
          // Check if there's a corresponding image in the uploaded files
          if (req.files && req.files.length > 0) {
            const file = req.files.find(f => f.fieldname === `image_new_${obs.tempId || Date.now()}`);
            
            if (file) {
              const fileBuffer = fs.readFileSync(file.path);
              
              // Upload image to Supabase Storage
              imageUrl = await uploadImage(fileBuffer, file.originalname, userId);
              
              // Clean up temporary file
              fs.unlinkSync(file.path);
            }
          }
          
          // Create new observation
          return {
            report_id: reportId,
            observation: obs.observation,
            risk_level: obs.riskLevel || 'low',
            image_url: imageUrl,
          };
        }
      });
      
      const processedObservations = await Promise.all(observationPromises);
      
      // Separate updates and inserts
      const observationsToUpdate = processedObservations.filter(obs => obs.id);
      const observationsToInsert = processedObservations.filter(obs => !obs.id);
      
      // Update existing observations
      if (observationsToUpdate.length > 0) {
        for (const obs of observationsToUpdate) {
          const { error } = await supabaseClient
            .from('observations')
            .update({
              observation: obs.observation,
              risk_level: obs.risk_level,
              image_url: obs.image_url,
            })
            .eq('id', obs.id)
            .eq('report_id', reportId);
          
          if (error) {
            throw new ApiError(400, error.message);
          }
        }
      }
      
      // Insert new observations
      if (observationsToInsert.length > 0) {
        const { error } = await supabaseClient
          .from('observations')
          .insert(observationsToInsert);
        
        if (error) {
          throw new ApiError(400, error.message);
        }
      }
    }
    
    // Get updated report with observations
    const { data: finalReport, error: finalError } = await supabaseClient
      .from('reports')
      .select(`
        *,
        observations (
          id,
          observation,
          risk_level,
          image_url
        )
      `)
      .eq('id', reportId)
      .single();
    
    if (finalError) {
      throw new ApiError(400, finalError.message);
    }
    
    res.json(finalReport);
  } catch (error) {
    // Clean up any temporary files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    next(error);
  }
};

/**
 * Delete a report
 */
const deleteReport = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    
    // Verify report exists and belongs to user
    const { data: existingReport, error: reportError } = await supabaseClient
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();
    
    if (reportError || !existingReport) {
      throw new ApiError(404, 'Report not found');
    }
    
    // Get observations to delete their images
    const { data: observations } = await supabaseClient
      .from('observations')
      .select('image_url')
      .eq('report_id', reportId);
    
    // Delete observations (will cascade delete from DB)
    const { error: deleteError } = await supabaseClient
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', userId);
    
    if (deleteError) {
      throw new ApiError(400, deleteError.message);
    }
    
    // Delete images from storage if any
    if (observations && observations.length > 0) {
      const imagePaths = observations
        .filter(obs => obs.image_url)
        .map(obs => {
          // Extract path from URL
          const url = new URL(obs.image_url);
          return url.pathname.split('/').pop();
        });
      
      if (imagePaths.length > 0) {
        await supabaseClient.storage
          .from('report-images')
          .remove(imagePaths);
      }
    }
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
};