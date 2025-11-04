import { useState } from 'react';
import { getDriverPoints, getDriverViolationCount, isDriverSuspended, getDriverViolationIds, getViolation } from '../services/web3Service';
import { getDriver, getDriverViolations } from '../services/api';
import { getMaxPoints } from '../services/web3Service';

function DriverSearch() {
  const [driverAddress, setDriverAddress] = useState('');
  const [driverData, setDriverData] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maxPoints, setMaxPoints] = useState(12);

  async function handleSearch() {
    if (!driverAddress || !/^0x[a-fA-F0-9]{40}$/.test(driverAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [points, count, suspended, max] = await Promise.all([
        getDriverPoints(driverAddress),
        getDriverViolationCount(driverAddress),
        isDriverSuspended(driverAddress),
        getMaxPoints()
      ]);

      setMaxPoints(max);

      const dbDriver = await getDriver(driverAddress);
      const dbViolations = await getDriverViolations(driverAddress);

      if (dbViolations.length > 0) {
        setViolations(dbViolations);
      } else {
        const violationIds = await getDriverViolationIds(driverAddress);
        const violationPromises = violationIds.map(id => getViolation(id));
        const blockchainViolations = await Promise.all(violationPromises);
        setViolations(blockchainViolations);
      }

      setDriverData({
        address: driverAddress,
        totalPoints: points,
        violationCount: count,
        isSuspended: suspended,
        fromDB: !!dbDriver
      });
    } catch (err) {
      setError(err.message || 'Error fetching driver data');
      setDriverData(null);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  return (
    <div>
      <div className="card">
        <h2>Search Driver</h2>
        <div style={{ marginTop: '20px' }}>
          <label className="label">Driver Ethereum Address</label>
          <input
            type="text"
            className="input"
            placeholder="0x..."
            value={driverAddress}
            onChange={(e) => setDriverAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {driverData && (
        <div className="card">
          <h2>Driver Information</h2>
          <div style={{ marginTop: '20px' }}>
            <p><strong>Address:</strong> {driverData.address}</p>
            <p style={{ marginTop: '12px' }}>
              <strong>Total Points:</strong> {driverData.totalPoints} / {maxPoints}
            </p>
            <p style={{ marginTop: '12px' }}>
              <strong>Violation Count:</strong> {driverData.violationCount}
            </p>
            <p style={{ marginTop: '12px' }}>
              <strong>Status:</strong>{' '}
              {driverData.isSuspended ? (
                <span className="badge badge-danger">Suspended</span>
              ) : (
                <span className="badge badge-success">Active</span>
              )}
            </p>
            {driverData.totalPoints >= maxPoints * 0.8 && driverData.totalPoints < maxPoints && (
              <div className="alert alert-warning" style={{ marginTop: '16px' }}>
                Warning: Driver is approaching suspension threshold
              </div>
            )}
          </div>
        </div>
      )}

      {violations.length > 0 && (
        <div className="card">
          <h2>Violations History</h2>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Points</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((violation) => (
                <tr key={violation.violation_id || violation.violationId}>
                  <td>{violation.violation_id || violation.violationId}</td>
                  <td>{violation.violation_type || violation.violationType}</td>
                  <td>{violation.points}</td>
                  <td>{formatDate(violation.timestamp)}</td>
                  <td>
                    {violation.is_revoked || violation.isRevoked ? (
                      <span className="badge badge-warning">Revoked</span>
                    ) : (
                      <span className="badge badge-danger">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DriverSearch;

