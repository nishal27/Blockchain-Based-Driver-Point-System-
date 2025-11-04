# Driver Point System - Full-Stack Blockchain Application

A full-stack decentralized driver violation tracking system using Ethereum & Solidity for tamper-proof record keeping. Complete with React frontend, Node.js backend, and blockchain integration.

## Features

- **Smart Contract**: Gas-optimized Solidity implementation for handling driver violations
- **React Frontend**: Modern UI with Web3 integration (MetaMask support)
- **Node.js Backend**: Express API with blockchain-to-database synchronization
- **Real-time Sync**: Automatic synchronization between blockchain and MySQL database
- **Automated Testing**: Comprehensive Truffle & Ganache test suite
- **Admin Panel**: Web interface for authorized users to record/revoke violations
- **Driver Search**: Query driver information and violation history

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL database
- Ganache (for local blockchain development)

## Installation

### Backend Setup

1. Install backend dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=driver_points_db
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=
```

3. Start Ganache:
   - Launch Ganache and create a new workspace
   - Note the RPC URL (usually http://127.0.0.1:7545)

4. Compile and deploy contracts:
```bash
npm run compile
npm run migrate
```

5. Copy the deployed contract address to `.env`:
```
CONTRACT_ADDRESS=0x...
```

6. Create MySQL database:
```sql
CREATE DATABASE driver_points_db;
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
npm install
```

2. Create frontend environment file:
```bash
cp .env.example .env
```

Edit `frontend/.env`:
```
VITE_CONTRACT_ADDRESS=0x...  # Same as backend CONTRACT_ADDRESS
VITE_RPC_URL=http://127.0.0.1:7545
```

## Running the Application

### Development Mode

**Option 1: Run both backend and frontend together**
```bash
npm run dev:all
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

The backend runs on `http://localhost:3000`
The frontend runs on `http://localhost:5173`

### Backend Service

The backend service will:
- Initialize the database schema
- Sync historical events from the blockchain
- Start listening for new events in real-time
- Update the database every 30 seconds
- Expose REST API endpoints

### Frontend Application

The frontend provides:
- **Dashboard**: System overview and statistics
- **Driver Search**: Look up driver information by Ethereum address
- **Admin Panel**: Record and revoke violations (owner only)

**Note**: Connect MetaMask wallet to interact with the smart contract. Admin functions require the contract owner's wallet.

## Running Tests

```bash
npm test
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/driver/:address` - Get driver information
- `GET /api/driver/:address/violations` - Get all violations for a driver

## Project Structure

```
blockchain/
├── contracts/
│   ├── DriverPointSystem.sol    # Main smart contract
│   └── Migrations.sol           # Truffle migrations contract
├── migrations/
│   ├── 1_initial_migration.js
│   └── 2_deploy_driver_point_system.js
├── test/
│   └── DriverPointSystem.test.js
├── middleware/
│   ├── database.js              # Database operations
│   ├── sync-service.js          # Blockchain sync service
│   ├── api.js                   # REST API routes
│   └── server.js                # Express server
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DriverSearch.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── services/            # Web3 and API services
│   │   │   ├── web3Service.js
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   └── copy-contract.js         # Copy contract ABI to frontend
├── truffle-config.js
└── package.json
```

## Smart Contract Functions

- `recordViolation(address, points, violationType)` - Record a violation (owner only)
- `revokeViolation(violationId)` - Revoke a violation (owner only)
- `getDriverPoints(address)` - Get driver's total points
- `getViolation(violationId)` - Get violation details
- `isDriverSuspended(address)` - Check if driver is suspended

## Security Features

- Access control (owner-only functions)
- Input validation
- Gas optimization with compiler optimizer
- Reentrancy protection
- Event logging for transparency

