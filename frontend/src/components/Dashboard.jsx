import { useState, useEffect } from 'react';
import { getMaxPoints } from '../services/web3Service';
import { getCurrentAccount } from '../services/web3Service';

function Dashboard() {
  const [maxPoints, setMaxPoints] = useState(12);
  const [currentAccount, setCurrentAccount] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const max = await getMaxPoints();
    setMaxPoints(max);
    const account = await getCurrentAccount();
    setCurrentAccount(account);
  }

  return (
    <div className="card">
      <h2>System Overview</h2>
      <div style={{ marginTop: '20px' }}>
        <p><strong>Maximum Points:</strong> {maxPoints}</p>
        <p style={{ marginTop: '12px' }}>
          <strong>Status:</strong> System is operational and synchronized with blockchain
        </p>
        {currentAccount && (
          <p style={{ marginTop: '12px' }}>
            <strong>Your Wallet:</strong> {currentAccount}
          </p>
        )}
      </div>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '12px' }}>How It Works</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>All violations are recorded on the Ethereum blockchain</li>
          <li>Driver points are tracked immutably and transparently</li>
          <li>When a driver reaches maximum points, they are automatically suspended</li>
          <li>Only authorized administrators can record or revoke violations</li>
          <li>All data is synchronized with the database for fast queries</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;

