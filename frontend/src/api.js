import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL || '/api';
const normalizedApiUrl = apiUrl.replace(/\/$/, '');
const api = axios.create({
  baseURL: normalizedApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const BACKEND_ORIGIN = normalizedApiUrl.startsWith('http')
  ? normalizedApiUrl.replace(/\/api$/i, '')
  : '';

export function installAgent() {
  return '/api/agent/install';
}

export default api;
