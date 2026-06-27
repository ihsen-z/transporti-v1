import axios from 'axios';
import { Platform } from 'react-native';

let API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

if (Platform.OS === 'web' && API_BASE_URL.includes('10.0.2.2')) {
  API_BASE_URL = API_BASE_URL.replace('10.0.2.2', 'localhost');
} else if (Platform.OS === 'android' && API_BASE_URL.includes('localhost')) {
  API_BASE_URL = API_BASE_URL.replace('localhost', '10.0.2.2');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
