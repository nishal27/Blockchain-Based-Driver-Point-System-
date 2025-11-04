import { useState, useEffect } from 'react';
import { recordViolation, revokeViolation, getMaxPoints } from '../services/web3Service';

function AdminPanel() {
  const [driverAddress, setDriverAddress] = useState('');
  const [points, setPoints] = useState('');
  const [violationType, setViolationType] = useState('');
  const [revokeId, setRevokeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [maxPoints, setMaxPoints] = useState(12);
  const [activeTab, setActiveTab] = useState('record');

  useEffect(() => {
    loadMaxPoints();
  }, []);

  async function loadMaxPoints() {
    const max = await getMaxPoints();
    setMaxPoints(max);
  }

  async function handleRecordViolation() {
    if (!driverAddress || !/^0x[a-fA-F0-9]{40}$/.test(driverAddress)) {
      setMessage({ type: 'error', text: 'Invalid driver address' });
      return;
    }

    const pointsNum = parseInt(points);
    if (!pointsNum || pointsNum <= 0 || pointsNum > maxPoints) {
      setMessage({ type: 'error', text: `Points must be between 1 and ${maxPoints}` });
      return;
    }

    if (!violationType.trim()) {
      setMessage({ type: 'error', text: 'Violation type is required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const tx = await recordViolation(driverAddress, pointsNum, violationType);
      setMessage({
        type: 'success',
        text: `Violation recorded successfully! Transaction: ${tx.hash}`
      });
      setDriverAddress('');
      setPoints('');
      setViolationType('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to record violation'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeViolation() {
    const violationId = parseInt(revokeId);
    if (isNaN(violationId) || violationId < 0) {
      setMessage({ type: 'error', text: 'Invalid violation ID' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const tx = await revokeViolation(violationId);
      setMessage({
        type: 'success',
        text: `Violation revoked successfully! Transaction: ${tx.hash}`
      });
      setRevokeId('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to revoke violation'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            className={`btn ${activeTab === 'record' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('record')}
            style={{ background: activeTab === 'record' ? '#667eea' : '#e0e0e0', color: activeTab === 'record' ? 'white' : '#333' }}
          >
            Record Violation
          </button>
          <button
            className={`btn ${activeTab === 'revoke' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('revoke')}
            style={{ background: activeTab === 'revoke' ? '#667eea' : '#e0e0e0', color: activeTab === 'revoke' ? 'white' : '#333' }}
          >
            Revoke Violation
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'record' && (
          <div>
            <h2>Record New Violation</h2>
            <div style={{ marginTop: '20px' }}>
              <label className="label">Driver Address</label>
              <input
                type="text"
                className="input"
                placeholder="0x..."
                value={driverAddress}
                onChange={(e) => setDriverAddress(e.target.value)}
              />

              <label className="label">Points (1 - {maxPoints})</label>
              <input
                type="number"
                className="input"
                placeholder="3"
                min="1"
                max={maxPoints}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />

              <label className="label">Violation Type</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Speeding, Reckless Driving"
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
              />

              <button
                className="btn btn-primary"
                onClick={handleRecordViolation}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Record Violation'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'revoke' && (
          <div>
            <h2>Revoke Violation</h2>
            <div style={{ marginTop: '20px' }}>
              <label className="label">Violation ID</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={revokeId}
                onChange={(e) => setRevokeId(e.target.value)}
              />

              <button
                className="btn btn-danger"
                onClick={handleRevokeViolation}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Revoke Violation'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Admin Instructions</h3>
        <ul style={{ lineHeight: '1.8', marginTop: '12px' }}>
          <li>Ensure your wallet is connected and you are the contract owner</li>
          <li>All transactions require gas fees and blockchain confirmation</li>
          <li>Violations are permanently recorded on the blockchain</li>
          <li>Revoking a violation will reduce the driver's points accordingly</li>
          <li>Maximum points per driver: {maxPoints}</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminPanel;

