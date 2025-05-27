const fs = require('fs');
const { supabaseClient } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Upload an image to Supabase Storage
 * @param {string} filePath - Path to file
 * @param {string} userId - User ID
 * @returns {Promise<string>} - URL of the uploaded image
 */
const uploadImageFromPath = async (filePath, userId) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = filePath.split('/').pop();
    const fileExt = fileName.split('.').pop();
    const storagePath = `${userId}/${uuidv4()}.${fileExt}`;
    
    const { error } = await supabaseClient.storage
      .from('report-images')
      .upload(storagePath, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
    
    // Get public URL
    const { data } = supabaseClient.storage
      .from('report-images')
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadImageFromPath:', error);
    throw error;
  }
};

/**
 * Upload an image buffer to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalName - Original file name
 * @param {string} userId - User ID
 * @returns {Promise<string>} - URL of the uploaded image
 */
const uploadImageBuffer = async (fileBuffer, originalName, userId) => {
  try {
    const fileExt = originalName.split('.').pop();
    const storagePath = `${userId}/${uuidv4()}.${fileExt}`;
    
    const { error } = await supabaseClient.storage
      .from('report-images')
      .upload(storagePath, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
    
    // Get public URL
    const { data } = supabaseClient.storage
      .from('report-images')
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadImageBuffer:', error);
    throw error;
  }
};

/**
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - URL of the image to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return true;
    
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const userId = pathParts[pathParts.length - 2];
    const path = `${userId}/${fileName}`;
    
    const { error } = await supabaseClient.storage
      .from('report-images')
      .remove([path]);
    
    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
};

module.exports = {
  uploadImageFromPath,
  uploadImageBuffer,
  deleteImage,
};