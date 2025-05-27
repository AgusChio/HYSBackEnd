const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

/**
 * Execute SQL migration file
 * @param {string} filePath - Path to SQL file
 */
const executeSQL = async (filePath) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing migration: ${path.basename(filePath)}`);
    
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error executing ${path.basename(filePath)}:`, error);
      return false;
    }
    
    console.log(`Successfully executed: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`Error reading or executing ${filePath}:`, error);
    return false;
  }
};

/**
 * Run all migrations in the migrations directory
 */
const runMigrations = async () => {
  try {
    const migrationsDir = path.join(__dirname, '../../supabase/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('Creating migrations directory...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort files to ensure they run in order
    
    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }
    
    console.log(`Found ${files.length} migration files.`);
    
    let successCount = 0;
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const success = await executeSQL(filePath);
      
      if (success) {
        successCount++;
      }
    }
    
    console.log(`Migration complete. ${successCount}/${files.length} files executed successfully.`);
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = {
  runMigrations,
  executeSQL,
};