const express = require('express');
const {
  getDriverFromDB,
  getViolationsFromDB
} = require('./database');

const router = express.Router();

router.get('/driver/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const driver = await getDriverFromDB(address);
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json(driver);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/driver/:address/violations', async (req, res) => {
  try {
    const { address } = req.params;
    const violations = await getViolationsFromDB(address);
    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

