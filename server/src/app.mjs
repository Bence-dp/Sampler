// src/app.mjs — corrigé complet
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";

import crypto from "crypto";
import multer from "multer";

import { Preset } from "./models/preset.model.mjs";
import {
  slugify, safePresetPath, fileExists,
  readJSON, writeJSON, listPresetFiles, validatePreset
} from "./utils.mjs";

export const app = express();
app.use(express.json({ limit: "2mb" }));

app.use(cors());

// configure multer for file uploads
// storage is diskStorage with destination and filename functions
// multer means "multipart/form-data" which is used for file uploads
// Before HTML5 it was not possible to upload files with AJAX easily
// so we use a form with enctype="multipart/form-data" and method="POST"
// The form can be submitted with JavaScript (e.g., fetch API) or directly by the browser
const upload = multer({
  storage: multer.diskStorage({
    // cb is the callback to indicate where to store the file
    destination: async (req, file, cb) => {
      const folder = req.params.folder || "";
      const destDir = path.join(DATA_DIR, folder);
      await fs.mkdir(destDir, { recursive: true }).catch(() => {});
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      // Use original filename
      cb(null, file.originalname);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // limit files to 10MB
});

// --------- Cross-platform paths (Mac/Linux/Windows) ---------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// PUBLIC_DIR: env var wins, else ../public (absolute path)
export const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.resolve(__dirname, "../public");

// DATA_DIR: env var wins, else <PUBLIC_DIR>/presets
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(PUBLIC_DIR, "presets");

// No decodeURIComponent needed anymore; these are file system paths


// Defines where static files are located, for example the file 
// data/presets/Basic Kit/kick.wav
// will be accessible at http://localhost:3000/presets/Basic%20Kit/kick.wav
// The file PUBLIC_DIR/index.html will be served at http://localhost:3000/ or 
// http://localhost:3000/index.html
// app.use should use a path that works on unix and windows
app.use(express.static(PUBLIC_DIR));

// Ensure data dir exists at startup (best-effort)
await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});

// ------- Routes -------
// This is where we define the API endpoints (also called web services or routes)
// Each route has a method (get, post, put, patch, delete) and a path (e.g., /api/presets)
// The handler function takes the request (req), response (res), and next (for error handling) as parameters

// Simple health check endpoint, this is generally the first endpoint to test
app.get("/api/health", (_req, res) => res.json({ ok: true, now: new Date().toISOString() }));

// GET list/search
app.get("/api/presets", async (req, res, next) => {
  try {
    const { q, type, factory } = req.query;
    
    let query = {};
    
    if (type) {
      query.type = new RegExp(String(type), 'i');
    }
    if (factory !== undefined) {
      query.isFactoryPresets = String(factory) === "true";
    }
    if (q) {
      const needle = String(q);
      query.$or = [
        { name: new RegExp(needle, 'i') },
        { 'samples.name': new RegExp(needle, 'i') },
        { 'samples.url': new RegExp(needle, 'i') }
      ];
    }

    const items = await Preset.find(query).lean();
    res.json(items);
  } catch (e) { next(e); }
});

// GET one preset by name or slug
app.get("/api/presets/:name", async (req, res, next) => {
  try {
    const preset = await Preset.findOne({
      $or: [
        { name: req.params.name },
        { slug: req.params.name }
      ]
    }).lean();
    
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
  } catch (e) { next(e); }
});

// POST for creating a new preset
app.post("/api/presets", async (req, res, next) => {
  try {
    const preset = req.body ?? {};

    const errs = validatePreset(preset);
    if (errs.length) return res.status(400).json({ errors: errs });

    const exists = await Preset.findOne({ name: preset.name });
    if (exists) return res.status(409).json({ error: "A preset with this name already exists" });

    const now = new Date().toISOString();
    const newPreset = new Preset({
      id: preset.id || crypto.randomUUID(),
      slug: slugify(preset.name),
      updatedAt: now,
      ...preset,
      name: preset.name,
    });
    
    await newPreset.save();
    res.status(201).json(newPreset.toObject());
  } catch (e) { next(e); }
});

// POST route for uploading audio sample files (.wav, .mp3 etc./) 
// This route will take as a parameter the sample/folder name where to store the file
// and the file will be available at http://localhost:3000/presets/:folder/:filename
// we can add multiple files with multer. 16 below is the max number of files accepted
// NOTE: THIS CODE IS INCOMPLETE: a folder should be created for each preset
// and the audio files should be stored in that folder.
// Here, if all files (the preset json file and the audio files) are uploaded at once, they all
// will be stored in the same folder, which is not what we want. We want:
// the preset file in the preset folder, and the audio files in a subfolder with the same name
// For example:
// public/presets/Basic Kit.json
// public/presets/Basic Kit/kick.wav
// public/presets/Basic Kit/snare.wav
// etc.
// To do that, we will need to modify later both this code and the front-end code
// We will see that in the next session
app.post("/api/upload/:folder", upload.array("files", 16), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files were uploaded." });
    }

    const destinationFolder = req.params.folder || "";
    console.log(`Uploaded ${req.files.length} files to folder: ${destinationFolder}`);

    const fileInfos = req.files.map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      size: file.size,
      url: `/presets/${req.params.folder}/${file.filename}`
    }));

    // If client requested preset creation, create JSON here
    const presetName = req.body && req.body.presetName ? String(req.body.presetName).trim() : null;

    if (presetName) {
      console.log('Request body:', req.body);
      
      // Parse sample names if provided
      let sampleNames = [];
      if (req.body.sampleNames) {
        try {
          sampleNames = JSON.parse(req.body.sampleNames);
          console.log('Parsed sample names:', sampleNames);
        } catch (e) {
          console.error('Error parsing sampleNames:', e);
        }
      }
      
      // Build samples array for the preset from uploaded files
      const fileSamples = fileInfos.map((f, index) => {
        const customName = sampleNames[index];
        console.log(`Sample ${index}: customName="${customName}", filename="${path.parse(f.storedName).name}"`);
        return {
          url: `./${req.params.folder}/${f.storedName}`,
          name: customName || path.parse(f.storedName).name
        };
      });

      // Add URL-based samples if provided
      let urlSamples = [];
      if (req.body.urlSamples) {
        try {
          urlSamples = JSON.parse(req.body.urlSamples);
          console.log('Parsed URL samples:', urlSamples);
        } catch (e) {
          console.error('Error parsing urlSamples:', e);
        }
      }

      const allSamples = [...fileSamples, ...urlSamples];
      console.log('All samples to be saved:', allSamples);

      const preset = {
        name: presetName,
        type: req.body.presetType || 'Recording',
        isFactoryPresets: false,
        samples: allSamples
      };

      const errs = validatePreset(preset);
      if (errs.length) {
        return res.status(400).json({ uploaded: fileInfos.length, files: fileInfos, presetErrors: errs });
      }

      const overwrite = req.body && (req.body.overwrite === '1' || String(req.body.overwrite).toLowerCase() === 'true');
      const existing = await Preset.findOne({ name: presetName });

        if (existing && !overwrite) {
          const now = new Date().toISOString();
          const existingSamples = Array.isArray(existing.samples) ? existing.samples.slice() : [];
          const newSamples = fileInfos.map(f => ({ url: `./${req.params.folder}/${f.storedName}`, name: path.parse(f.storedName).name }));
          const toAdd = newSamples.filter(ns => !existingSamples.some(es => es.url === ns.url || es.name === ns.name));

          const merged = {
            id: existing.id || crypto.randomUUID(),
            slug: slugify(existing.name || preset.name),
            updatedAt: now,
            name: existing.name || preset.name,
            type: existing.type || preset.type,
            isFactoryPresets: existing.isFactoryPresets || preset.isFactoryPresets,
            samples: existingSamples.concat(toAdd)
          };

          const errs = validatePreset(merged);
          if (errs.length) {
            return res.status(400).json({ uploaded: fileInfos.length, files: fileInfos, presetErrors: errs });
          }

          const updated = await Preset.findByIdAndUpdate(existing._id, merged, { new: true });
          return res.status(200).json({ uploaded: fileInfos.length, files: fileInfos, preset: updated.toObject(), appended: toAdd.length });
        }

        const now = new Date().toISOString();
        const withMeta = { id: crypto.randomUUID(), slug: slugify(preset.name), updatedAt: now, ...preset, name: preset.name };
        const newPreset = new Preset(withMeta);
        await newPreset.save();

        return res.status(201).json({ uploaded: fileInfos.length, files: fileInfos, preset: newPreset.toObject(), overwritten: overwrite });
    }

    // default response when no preset creation requested
    res.status(201).json({ uploaded: fileInfos.length, files: fileInfos });
  } catch (err) {
    next(err);
  }
});

// PUT for replacing or renaming a preset file completely
app.put("/api/presets/:name", async (req, res, next) => {
  try {
    const oldPreset = await Preset.findOne({
      $or: [{ name: req.params.name }, { slug: req.params.name }]
    });
    if (!oldPreset) return res.status(404).json({ error: "Preset not found" });

    const preset = req.body ?? {};
    const errs = validatePreset(preset);
    if (errs.length) return res.status(400).json({ errors: errs });

    const now = new Date().toISOString();
    const withMeta = {
      id: oldPreset.id || preset.id || crypto.randomUUID(),
      slug: slugify(preset.name),
      updatedAt: now,
      ...preset,
      name: preset.name,
    };
    
    const updated = await Preset.findByIdAndUpdate(
      oldPreset._id,
      withMeta,
      { new: true }
    );
    
    res.json(updated.toObject());
  } catch (e) { next(e); }
});

// PATCH partial
app.patch("/api/presets/:name", async (req, res, next) => {
  try {
    const oldPreset = await Preset.findOne({
      $or: [{ name: req.params.name }, { slug: req.params.name }]
    });
    if (!oldPreset) return res.status(404).json({ error: "Preset not found" });

    const merged = { ...oldPreset.toObject(), ...req.body };
    merged.name = merged.name ?? oldPreset.name;
    const errs = validatePreset(merged, { partial: true });
    if (errs.length) return res.status(400).json({ errors: errs });

    merged.slug = slugify(merged.name);
    merged.updatedAt = new Date().toISOString();

    const updated = await Preset.findByIdAndUpdate(
      oldPreset._id,
      merged,
      { new: true }
    );

    res.json(updated.toObject());
  } catch (e) { next(e); }
});

// DELETE a preset by name
app.delete("/api/presets/:name", async (req, res, next) => {
  try {
    const preset = await Preset.findOne({
      $or: [{ name: req.params.name }, { slug: req.params.name }]
    });
    
    if (preset) {
      await Preset.findByIdAndDelete(preset._id);
      
      const folderPath = path.join(DATA_DIR, req.params.name);
      await fs.rm(folderPath, { recursive: true, force: true }).catch(() => {});
    }
    
    res.status(204).send();
  } catch (e) { next(e); }
});

// POST for seeding multiple presets at once
app.post("/api/presets:seed", async (req, res, next) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : null;
    if (!arr) return res.status(400).json({ error: "Body must be an array of presets" });

    let created = 0; const slugs = [];
    for (const p of arr) {
      const errs = validatePreset(p);
      if (errs.length) return res.status(400).json({ errors: errs });
      const now = new Date().toISOString();
      const withMeta = { 
        id: p.id || crypto.randomUUID(), 
        slug: slugify(p.name), 
        updatedAt: now, 
        ...p, 
        name: p.name 
      };
      
      await Preset.findOneAndUpdate(
        { name: withMeta.name },
        withMeta,
        { upsert: true, new: true }
      );
      
      created++; 
      slugs.push(withMeta.slug);
    }
    res.status(201).json({ created, slugs });
  } catch (e) { next(e); }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});
