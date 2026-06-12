const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Trigger agent installer download on the server.
router.get('/install', async (req, res) => {
  try {
    // Source MSI (built by installer script)
    const msiPath = path.resolve(__dirname, '..', '..', 'installer', 'output', 'LuxAgent.msi');

    if (!fs.existsSync(msiPath)) {
      return res.status(404).json({ error: 'MSI not found. Build it first using installer/build.ps1' });
    }

    res.download(msiPath, 'LuxAgent.msi', (err) => {
      if (err) {
        console.error('Error downloading agent:', err);
        // Do not attempt to send another response if headers are already sent
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download agent', details: err.message });
        }
      }
    });

  } catch (error) {
    console.error('Error processing agent download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process download', details: error.message });
    }
  }
});

router.get('/installs', (req, res) => {
  // This route might need to be re-evaluated as we are no longer storing install requests.
  // For now, it returns an empty array.
  res.json({ installs: [] });
});

module.exports = router;
