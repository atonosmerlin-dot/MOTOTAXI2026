import React from 'react';
import AuthPage from '../auth/AuthPage';
import { useManifest } from '@/hooks/useManifest';

const DriverLogin: React.FC = () => {
  useManifest('/manifest-driver.json');
  return <AuthPage redirectTo="/driver" title="Área do Motorista" />;
};

export default DriverLogin;
