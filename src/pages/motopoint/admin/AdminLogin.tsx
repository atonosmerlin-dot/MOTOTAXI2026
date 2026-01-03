import React from 'react';
import AuthPage from '../auth/AuthPage';

const AdminLogin: React.FC = () => {
  return <AuthPage redirectTo="/admin" title="Painel Admin" />;
};

export default AdminLogin;
