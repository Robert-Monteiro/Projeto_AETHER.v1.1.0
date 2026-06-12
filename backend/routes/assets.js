const express = require('express');
const Joi = require('joi');
const store = require('../database/dataStore');

const router = express.Router();

// Validation schemas
const assetSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('hardware', 'software', 'license', 'other').required(),
  category: Joi.string().required(),
  manufacturer: Joi.string().optional(),
  model: Joi.string().optional(),
  serialNumber: Joi.string().optional(),
  purchaseDate: Joi.date().optional(),
  warrantyExpiry: Joi.date().optional(),
  location: Joi.string().optional(),
  assignedTo: Joi.number().integer().optional(),
  status: Joi.string().valid('active', 'inactive', 'maintenance', 'retired').default('active'),
  cost: Joi.number().optional(),
  licenseKey: Joi.string().optional(),
  licenseExpiry: Joi.date().optional(),
  notes: Joi.string().optional(),
});

// Get all assets
router.get('/', (req, res) => {
  try {
    const { type, status, category } = req.query;
    const assets = store.getAllAssets({ type, status, category });
    res.json(assets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create asset
router.post('/', (req, res) => {
  try {
    const { error, value } = assetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const newAsset = store.addAsset(value);
    res.status(201).json(newAsset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get asset by ID
router.get('/:id', (req, res) => {
  try {
    const asset = store.findAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update asset
router.put('/:id', (req, res) => {
  try {
    const { error, value } = assetSchema.validate(req.body, { allowUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const updatedAsset = store.updateAsset(req.params.id, value);
    if (!updatedAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(updatedAsset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete asset
router.delete('/:id', (req, res) => {
  try {
    const deletedAsset = store.deleteAsset(req.params.id);
    if (!deletedAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Compliance check
router.get('/compliance/check', (req, res) => {
  try {
    const assets = store.getAllAssets();
    const now = new Date();

    const expiredWarranties = assets.filter(a => 
      a.warrantyExpiry && new Date(a.warrantyExpiry) < now && a.status === 'active'
    );

    const expiredLicenses = assets.filter(a => 
      a.licenseExpiry && new Date(a.licenseExpiry) < now && a.type === 'license' && a.status === 'active'
    );

    res.json({
      expiredWarranties,
      expiredLicenses,
      totalIssues: expiredWarranties.length + expiredLicenses.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
