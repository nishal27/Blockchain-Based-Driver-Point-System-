const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api');
const { startSyncService } = require('./sync-service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

async function startServer() {
  await startSyncService();
  
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;

