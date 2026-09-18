import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Search from './pages/Search.jsx';
import Upload from './pages/Upload.jsx';
import PartDetail from './pages/PartDetail.jsx';
import Analytics from './pages/Analytics.jsx';
import History from './pages/History.jsx';
import Billing from './pages/Billing.jsx';
import { useAuth } from './lib/auth.jsx';

/** Sends signed-out visitors to the login page, remembering where they wanted. */
function Protected({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/part/:partNo" element={<PartDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/history" element={<History />} />
        <Route path="/billing" element={<Billing />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
