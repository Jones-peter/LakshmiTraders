
"use client";

import { useContext } from 'react';
import AuthContext from '@/contexts/auth-context';
import type { AuthContextType } from '@/types';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
