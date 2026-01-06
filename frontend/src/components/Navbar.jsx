import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Search, User, Heart, LogOut } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              FundEd
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/browse" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
              Browse Campaigns
            </Link>
            <Link to="/how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
              How It Works
            </Link>
            {user && (
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                Dashboard
              </Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2"
                >
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                  <span className="hidden md:inline">{user.name}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/create-campaign')} className="bg-blue-600 hover:bg-blue-700">
                  Start Campaign
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
