import { createContext } from 'react';

// Kept apart from LanguageContext.jsx so that file only exports components (fast refresh)
export const LanguageContext = createContext(null);
