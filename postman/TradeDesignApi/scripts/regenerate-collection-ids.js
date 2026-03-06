/**
 * Regenerate Postman Collection IDs
 * 
 * This script reads all collection JSON files from postman/collections/,
 * regenerates all UUIDs (info._postman_id and item ids), and writes
 * cleaned copies to postman/collections_clean_import/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Recursively regenerate IDs for all items (requests, folders)
function regenerateItemIds(items) {
  if (!Array.isArray(items)) return items;
  
  return items.map(item => {
    const newItem = { ...item };
    
    // Regenerate this item's ID if it exists
    if (newItem.id) {
      newItem.id = generateUUID();
    }
    
    // Recursively process nested items (folders)
    if (newItem.item && Array.isArray(newItem.item)) {
      newItem.item = regenerateItemIds(newItem.item);
    }
    
    // Process response examples if they have IDs
    if (newItem.response && Array.isArray(newItem.response)) {
      newItem.response = newItem.response.map(resp => {
        if (resp.id) {
          return { ...resp, id: generateUUID() };
        }
        return resp;
      });
    }
    
    return newItem;
  });
}

// Process a single collection
function processCollection(collectionData) {
  const newCollection = JSON.parse(JSON.stringify(collectionData)); // Deep clone
  
  // Regenerate collection ID
  if (newCollection.info && newCollection.info._postman_id) {
    const oldId = newCollection.info._postman_id;
    newCollection.info._postman_id = generateUUID();
    console.log(`  Collection ID: ${oldId} -> ${newCollection.info._postman_id}`);
  }
  
  // Regenerate all item IDs
  if (newCollection.item) {
    newCollection.item = regenerateItemIds(newCollection.item);
  }
  
  return newCollection;
}

// Main execution
function main() {
  const sourceDir = path.join(__dirname, '..', 'postman', 'collections');
  const targetDir = path.join(__dirname, '..', 'postman', 'collections_clean_import');
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${targetDir}`);
  }
  
  // Get all JSON files in source directory
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.postman_collection.json'));
  
  console.log(`\nFound ${files.length} collection(s) to process:\n`);
  
  const idMapping = {};
  
  for (const file of files) {
    console.log(`Processing: ${file}`);
    
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    try {
      // Read and parse collection
      const content = fs.readFileSync(sourcePath, 'utf8');
      // Remove BOM if present
      const cleanContent = content.replace(/^\uFEFF/, '');
      const collection = JSON.parse(cleanContent);
      
      const oldId = collection.info?._postman_id;
      
      // Process collection
      const newCollection = processCollection(collection);
      
      // Track ID mapping
      if (oldId) {
        idMapping[file] = {
          oldId,
          newId: newCollection.info._postman_id
        };
      }
      
      // Write to target directory
      fs.writeFileSync(targetPath, JSON.stringify(newCollection, null, 2), 'utf8');
      console.log(`  Written to: ${targetPath}\n`);
      
    } catch (error) {
      console.error(`  ERROR processing ${file}: ${error.message}\n`);
    }
  }
  
  // Summary
  console.log('\n=== ID Mapping Summary ===\n');
  for (const [file, mapping] of Object.entries(idMapping)) {
    console.log(`${file}:`);
    console.log(`  Old: ${mapping.oldId}`);
    console.log(`  New: ${mapping.newId}\n`);
  }
  
  console.log(`\nDone! Cleaned collections written to: ${targetDir}`);
}

main();
