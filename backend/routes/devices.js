const express = require('express');
const path = require('path');
const fs = require('fs');
const store = require('../database/dataStore');

const router = express.Router();
const devicesDir = path.resolve(__dirname, '..', 'database', 'Dispositivos');

// Ensure directory exists
if (!fs.existsSync(devicesDir)) {
  fs.mkdirSync(devicesDir, { recursive: true });
}

// Validate device payload
const validateDevicePayload = (payload) => {
  const requiredFields = ['hostname', 'system_info', 'installed_software', 'network_devices', 'scan_timestamp'];
  return requiredFields.every(field => Object.prototype.hasOwnProperty.call(payload, field));
};

// Convert hostname to a safe filename
const getDeviceFilePath = (hostname) => {
  const safeName = hostname.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return path.join(devicesDir, `${safeName}.json`);
};

// Update device file on disk and in memory
const saveDeviceFile = (device) => {
  const filePath = getDeviceFilePath(device.hostname);
  const content = {
    ...device,
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  return content;
};

// Create/update device data from agent
router.post('/', (req, res) => {
  try {
    const deviceData = req.body;
    if (!validateDevicePayload(deviceData)) {
      return res.status(400).json({ error: 'Invalid device payload. Required fields: hostname, system_info, installed_software, network_devices, scan_timestamp.' });
    }

    const device = store.addOrUpdateDevice(deviceData);
    const savedDevice = saveDeviceFile(device);

    res.status(201).json({ message: 'Device data stored successfully', device: savedDevice });
  } catch (error) {
    console.error('Error saving device data:', error);
    res.status(500).json({ error: 'Failed to store device data' });
  }
});

// List all devices
router.get('/', (req, res) => {
  try {
    const devices = store.getAllDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error listing devices:', error);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// Get device by hostname
router.get('/:hostname', (req, res) => {
  try {
    const device = store.getDeviceByHostname(req.params.hostname);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error('Error getting device:', error);
    res.status(500).json({ error: 'Failed to retrieve device data' });
  }
});

module.exports = router;
