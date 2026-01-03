import React from 'react';
import AuthPage from '../auth/AuthPage';

const DriverLogin: React.FC = () => {
  return <AuthPage redirectTo="/driver" title="Área do Motorista" />;
};

export default DriverLogin;
