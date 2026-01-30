import mongoose from 'mongoose';

const sampleSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const presetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  slug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  isFactoryPresets: { type: Boolean, default: false },
  samples: [sampleSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'presets' });

export const Preset = mongoose.model('Preset', presetSchema);
