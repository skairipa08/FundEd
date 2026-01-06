import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import CampaignDetail from './pages/CampaignDetail';
import CreateCampaign from './pages/CreateCampaign';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DonateSuccess from './pages/DonateSuccess';
import { Toaster } from './components/ui/toaster';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Callback Component
const AuthCallback = ({ onLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasProcessed = React.useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      if (hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          // Exchange session_id for user data and session_token
          const response = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
            headers: {
              'X-Session-ID': sessionId
            }
          });

          if (!response.ok) throw new Error('Failed to get session data');

          const userData = await response.json();
          
          // Send to backend to create session
          const backendResponse = await fetch(`${API}/auth/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData),
            credentials: 'include'
          });

          if (!backendResponse.ok) throw new Error('Failed to create session');

          const user = await backendResponse.json();
          onLogin(user);
          navigate('/dashboard', { state: { user }, replace: true });
        } catch (error) {
          console.error('Auth error:', error);
          navigate('/login', { replace: true });
        }
      }
    };

    processSession();
  }, [location, navigate, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [currentUser, setCurrentUser] = useState(location.state?.user || user);

  useEffect(() => {
    if (location.state?.user) return; // Skip if user passed from AuthCallback

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Not authenticated');
        const userData = await response.json();
        setIsAuthenticated(true);
        setCurrentUser(userData);
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? React.cloneElement(children, { user: currentUser }) : null;
};

// Router Component
function AppRouter({ user, onLogin, onLogout }) {
  const location = useLocation();

  // Check URL fragment for session_id during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback onLogin={onLogin} />;
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/campaign/:id" element={<CampaignDetail />} />
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route
          path="/create-campaign"
          element={
            <ProtectedRoute user={user}>
              <CreateCampaign />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;
