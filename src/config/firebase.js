import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase web config is public by design (shipped in the bundle).
const firebaseConfig = {
  apiKey: 'AIzaSyBfYDziPzi3WLU00Ic0nxX_CHNRqh8wskk',
  authDomain: 'kajache-82e1c.firebaseapp.com',
  projectId: 'kajache-82e1c',
  storageBucket: 'kajache-82e1c.firebasestorage.app',
  messagingSenderId: '279075178563',
  appId: '1:279075178563:web:2a2b2d2669516227a1acf6',
  measurementId: 'G-1ZSJNYZ8F9',
};

export const app = initializeApp(firebaseConfig);

// Analytics is unavailable in some browsers (blocked cookies, privacy mode).
export const analyticsPromise = isSupported().then((ok) => (ok ? getAnalytics(app) : null));
