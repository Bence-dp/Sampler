import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';
import crypto from 'crypto';
import { Preset } from './src/models/preset.model.mjs';
import { connectDB, disconnectDB } from './src/db.mjs';
import { slugify } from './src/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'public/presets');

async function importPresets() {
  try {
    await connectDB();
    
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} preset files to import`);
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(DATA_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const preset = JSON.parse(content);
        
        if (!preset.id) {
          preset.id = crypto.randomUUID();
        }
        if (!preset.slug) {
          preset.slug = slugify(preset.name);
        }
        if (!preset.updatedAt) {
          preset.updatedAt = new Date().toISOString();
        }
        
        await Preset.findOneAndUpdate(
          { name: preset.name },
          preset,
          { upsert: true, new: true }
        );
        
        console.log(`Imported: ${preset.name}`);
      } catch (err) {
        console.error(`Error importing ${file}:`, err.message);
      }
    }
    
    const count = await Preset.countDocuments();
    console.log(`\nImport complete. Total presets in DB: ${count}`);
    
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importPresets();
