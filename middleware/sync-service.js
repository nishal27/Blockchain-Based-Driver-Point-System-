const { Web3 } = require('web3');
const DriverPointSystem = require('../build/contracts/DriverPointSystem.json');
const {
  initializeDatabase,
  upsertDriver,
  upsertViolation,
  updateLastSyncedBlock,
  getLastSyncedBlock
} = require('./database');
require('dotenv').config();

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

let web3;
let contract;
let isSyncing = false;

async function initializeWeb3() {
  try {
    web3 = new Web3(RPC_URL);
    const accounts = await web3.eth.getAccounts();
    console.log('Connected to blockchain. Accounts:', accounts.length);

    if (!CONTRACT_ADDRESS) {
      console.log('Warning: CONTRACT_ADDRESS not set. Please set it in .env file');
      return false;
    }

    contract = new web3.eth.Contract(
      DriverPointSystem.abi,
      CONTRACT_ADDRESS
    );

    console.log('Contract initialized at:', CONTRACT_ADDRESS);
    return true;
  } catch (error) {
    console.error('Web3 initialization error:', error);
    return false;
  }
}

async function syncViolationEvent(event) {
  try {
    const violationId = event.returnValues.violationId;
    const driverAddress = event.returnValues.driver;
    const points = parseInt(event.returnValues.points);
    const violationType = event.returnValues.violationType;
    const timestamp = parseInt(event.returnValues.timestamp);

    const driverData = await contract.methods.drivers(driverAddress).call();
    const isSuspended = parseInt(driverData.totalPoints) >= parseInt(await contract.methods.maxPoints().call());

    await upsertDriver(
      driverAddress,
      parseInt(driverData.totalPoints),
      parseInt(driverData.violationCount),
      isSuspended
    );

    await upsertViolation({
      violationId: parseInt(violationId),
      driverAddress: driverAddress,
      points: points,
      violationType: violationType,
      timestamp: timestamp,
      isRevoked: false,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });

    console.log(`Synced violation ${violationId} for driver ${driverAddress}`);
  } catch (error) {
    console.error('Error syncing violation event:', error);
  }
}

async function syncRevokeEvent(event) {
  try {
    const violationId = event.returnValues.violationId;
    const driverAddress = event.returnValues.driver;
    const points = parseInt(event.returnValues.points);

    const violation = await contract.methods.getViolation(violationId).call();
    const driverData = await contract.methods.drivers(driverAddress).call();
    const isSuspended = parseInt(driverData.totalPoints) >= parseInt(await contract.methods.maxPoints().call());

    await upsertDriver(
      driverAddress,
      parseInt(driverData.totalPoints),
      parseInt(driverData.violationCount),
      isSuspended
    );

    await upsertViolation({
      violationId: parseInt(violationId),
      driverAddress: driverAddress,
      points: parseInt(violation.points),
      violationType: violation.violationType,
      timestamp: parseInt(violation.timestamp),
      isRevoked: true,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });

    console.log(`Synced revocation of violation ${violationId} for driver ${driverAddress}`);
  } catch (error) {
    console.error('Error syncing revoke event:', error);
  }
}

async function syncHistoricalEvents() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const lastSyncedBlock = await getLastSyncedBlock();
    const currentBlock = await web3.eth.getBlockNumber();
    const fromBlock = lastSyncedBlock > 0 ? lastSyncedBlock + 1 : 0;

    if (fromBlock > currentBlock) {
      isSyncing = false;
      return;
    }

    console.log(`Syncing events from block ${fromBlock} to ${currentBlock}`);

    const violationEvents = await contract.getPastEvents('ViolationRecorded', {
      fromBlock: fromBlock,
      toBlock: currentBlock
    });

    const revokeEvents = await contract.getPastEvents('PointsRevoked', {
      fromBlock: fromBlock,
      toBlock: currentBlock
    });

    for (const event of violationEvents) {
      await syncViolationEvent(event);
    }

    for (const event of revokeEvents) {
      await syncRevokeEvent(event);
    }

    await updateLastSyncedBlock(currentBlock);
    console.log(`Historical sync completed. Synced ${violationEvents.length} violations and ${revokeEvents.length} revocations`);
  } catch (error) {
    console.error('Error syncing historical events:', error);
  } finally {
    isSyncing = false;
  }
}

async function startEventListeners() {
  if (!contract) {
    console.error('Contract not initialized. Cannot start event listeners.');
    return;
  }

  contract.events.ViolationRecorded({})
    .on('data', async (event) => {
      console.log('New ViolationRecorded event detected');
      await syncViolationEvent(event);
      await updateLastSyncedBlock(event.blockNumber);
    })
    .on('error', (error) => {
      console.error('Error listening to ViolationRecorded events:', error);
    });

  contract.events.PointsRevoked({})
    .on('data', async (event) => {
      console.log('New PointsRevoked event detected');
      await syncRevokeEvent(event);
      await updateLastSyncedBlock(event.blockNumber);
    })
    .on('error', (error) => {
      console.error('Error listening to PointsRevoked events:', error);
    });

  contract.events.DriverSuspended({})
    .on('data', (event) => {
      console.log(`Driver ${event.returnValues.driver} suspended`);
    })
    .on('error', (error) => {
      console.error('Error listening to DriverSuspended events:', error);
    });

  contract.events.DriverReinstated({})
    .on('data', (event) => {
      console.log(`Driver ${event.returnValues.driver} reinstated`);
    })
    .on('error', (error) => {
      console.error('Error listening to DriverReinstated events:', error);
    });

  console.log('Event listeners started');
}

async function startSyncService() {
  try {
    await initializeDatabase();
    console.log('Database initialized');

    const web3Initialized = await initializeWeb3();
    if (!web3Initialized) {
      console.error('Failed to initialize Web3. Exiting...');
      process.exit(1);
    }

    await syncHistoricalEvents();
    await startEventListeners();

    setInterval(async () => {
      await syncHistoricalEvents();
    }, 30000);

    console.log('Sync service started successfully');
  } catch (error) {
    console.error('Failed to start sync service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startSyncService();
}

module.exports = { startSyncService };

