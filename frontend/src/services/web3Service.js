import { ethers } from 'ethers';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:7545';

let provider;
let signer;
let contract;
let contractABI = null;

async function loadContractABI() {
  if (!contractABI) {
    try {
      const response = await fetch('/build/contracts/DriverPointSystem.json');
      const data = await response.json();
      contractABI = data.abi;
    } catch (error) {
      console.error('Failed to load contract ABI:', error);
      throw new Error('Contract ABI not found. Please compile the contract first.');
    }
  }
  return contractABI;
}

export async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      return signer.address;
    } catch (error) {
      throw new Error('User rejected connection');
    }
  } else {
    throw new Error('MetaMask not installed');
  }
}

export function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

export async function getContract() {
  if (!contract && CONTRACT_ADDRESS) {
    const abi = await loadContractABI();
    const provider = getProvider();
    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      abi,
      provider
    );
  }
  return contract;
}

export async function getContractWithSigner() {
  if (!signer) {
    await connectWallet();
  }
  if (!contract && CONTRACT_ADDRESS) {
    const abi = await loadContractABI();
    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      abi,
      signer
    );
  }
  return contract;
}

export async function getCurrentAccount() {
  if (typeof window.ethereum !== 'undefined') {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  }
  return null;
}

export async function isOwner() {
  try {
    const contract = await getContract();
    if (!contract) return false;
    const owner = await contract.owner();
    const currentAccount = await getCurrentAccount();
    return currentAccount && currentAccount.toLowerCase() === owner.toLowerCase();
  } catch (error) {
    return false;
  }
}

export async function recordViolation(driverAddress, points, violationType) {
  const contract = await getContractWithSigner();
  const tx = await contract.recordViolation(driverAddress, points, violationType);
  return await tx.wait();
}

export async function revokeViolation(violationId) {
  const contract = await getContractWithSigner();
  const tx = await contract.revokeViolation(violationId);
  return await tx.wait();
}

export async function getDriverPoints(driverAddress) {
  const contract = await getContract();
  if (!contract) return 0;
  const points = await contract.getDriverPoints(driverAddress);
  return parseInt(points.toString());
}

export async function getDriverViolationCount(driverAddress) {
  const contract = await getContract();
  if (!contract) return 0;
  const count = await contract.getDriverViolationCount(driverAddress);
  return parseInt(count.toString());
}

export async function getViolation(violationId) {
  const contract = await getContract();
  if (!contract) return null;
  const violation = await contract.getViolation(violationId);
  return {
    violationId: parseInt(violation.violationId.toString()),
    driver: violation.driver,
    points: parseInt(violation.points.toString()),
    violationType: violation.violationType,
    timestamp: parseInt(violation.timestamp.toString()),
    isRevoked: violation.isRevoked
  };
}

export async function getDriverViolationIds(driverAddress) {
  const contract = await getContract();
  if (!contract) return [];
  const ids = await contract.getDriverViolationIds(driverAddress);
  return ids.map(id => parseInt(id.toString()));
}

export async function isDriverSuspended(driverAddress) {
  const contract = await getContract();
  if (!contract) return false;
  return await contract.isDriverSuspended(driverAddress);
}

export async function getMaxPoints() {
  const contract = await getContract();
  if (!contract) return 12;
  const max = await contract.maxPoints();
  return parseInt(max.toString());
}

