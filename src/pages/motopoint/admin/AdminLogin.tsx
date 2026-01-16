import React from 'react';
import AuthPage from '../auth/AuthPage';
import { useManifest } from '@/hooks/useManifest';

const AdminLogin: React.FC = () => {
  useManifest('/manifest-admin.json');
  return <AuthPage redirectTo="/admin" title="Painel Admin" />;
};

export default AdminLogin;
