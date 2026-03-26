/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ConfirmEmail } from './pages/ConfirmEmail';
import { RecoverPassword } from './pages/RecoverPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Config } from './pages/Config';
import { Users } from './pages/Users';
import { ChangePassword } from './pages/ChangePassword';
import { History } from './pages/History';
import { Groups } from './pages/Groups';
import { SystemSettings } from './pages/SystemSettings';
import { Billing } from './pages/Billing';
import { Payments } from './pages/Payments';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/recover-password" element={<RecoverPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/change-password" element={<ChangePassword />} />
              
              <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin']} />}>
                <Route path="/config" element={<Config />} />
                <Route path="/users" element={<Users />} />
                <Route path="/billing" element={<Billing />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="/groups" element={<Groups />} />
                <Route path="/system-settings" element={<SystemSettings />} />
                <Route path="/payments" element={<Payments />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
