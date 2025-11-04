import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DriverSearch from './components/DriverSearch';
import AdminPanel from './components/AdminPanel';
import { getCurrentAccount, isOwner } from './services/web3Service';

function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [currentAccount]);

  async function checkConnection() {
    const account = await getCurrentAccount();
    setCurrentAccount(account);
  }

  async function checkAdminStatus() {
    if (currentAccount) {
      const admin = await isOwner();
      setIsAdmin(admin);
    } else {
      setIsAdmin(false);
    }
  }

  async function handleConnect() {
    try {
      const { connectWallet } = await import('./services/web3Service');
      const account = await connectWallet();
      setCurrentAccount(account);
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Driver Point System</h1>
        <p>Decentralized Violation Tracking on Blockchain</p>
        <div style={{ marginTop: '16px' }}>
          {currentAccount ? (
            <div>
              <strong>Connected:</strong> {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
              {isAdmin && <span className="badge badge-success" style={{ marginLeft: '12px' }}>Admin</span>}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleConnect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ background: activeTab === 'dashboard' ? '#667eea' : '#e0e0e0', color: activeTab === 'dashboard' ? 'white' : '#333' }}
        >
          Dashboard
        </button>
        <button
          className={`btn ${activeTab === 'search' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('search')}
          style={{ background: activeTab === 'search' ? '#667eea' : '#e0e0e0', color: activeTab === 'search' ? 'white' : '#333' }}
        >
          Search Driver
        </button>
        {isAdmin && (
          <button
            className={`btn ${activeTab === 'admin' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('admin')}
            style={{ background: activeTab === 'admin' ? '#667eea' : '#e0e0e0', color: activeTab === 'admin' ? 'white' : '#333' }}
          >
            Admin Panel
          </button>
        )}
      </div>

      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'search' && <DriverSearch />}
      {activeTab === 'admin' && isAdmin && <AdminPanel />}
    </div>
  );
}

export default App;

