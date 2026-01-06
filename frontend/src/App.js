import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Browse from './pages/Browse';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DonateSuccess from './pages/DonateSuccess';
import AuthCallback from './pages/AuthCallback';
import { Toaster } from './components/ui/toaster';
import { getCurrentUser, logout as authLogout } from './services/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Protected Route Component
const ProtectedRoute = ({ children, user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If we already have user data, no need to check
      if (user) {
        setIsChecking(false);
        return;
      }

      try {
        const result = await getCurrentUser();
        if (result?.success && result?.data) {
          setUser(result.data);
        } else {
          navigate('/login', { state: { from: location.pathname } });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login', { state: { from: location.pathname } });
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [user, navigate, location.pathname, setUser]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? React.cloneElement(children, { user }) : null;
};

// Main Router Component
function AppRouter({ user, setUser, onLogout }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={onLogout} />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/campaign/:id" element={<CampaignDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback onLogin={setUser} />} />
          <Route path="/donate/success" element={<DonateSuccess />} />
          <Route
            path="/create-campaign"
            element={
              <ProtectedRoute user={user} setUser={setUser}>
                <CreateCampaign />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} setUser={setUser}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const result = await getCurrentUser();
        if (result?.success && result?.data) {
          setUser(result.data);
        }
      } catch (error) {
        // User not logged in, that's fine
        console.log('No existing session');
      } finally {
        setInitialCheckDone(true);
      }
    };

    checkExistingSession();
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    window.location.href = '/';
  };

  // Show loading while checking initial auth state
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter user={user} setUser={setUser} onLogout={handleLogout} />
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;
