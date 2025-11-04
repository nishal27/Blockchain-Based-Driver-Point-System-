import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function getDriver(address) {
  try {
    const response = await axios.get(`${API_BASE_URL}/driver/${address}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getDriverViolations(address) {
  try {
    const response = await axios.get(`${API_BASE_URL}/driver/${address}/violations`);
    return response.data;
  } catch (error) {
    return [];
  }
}

