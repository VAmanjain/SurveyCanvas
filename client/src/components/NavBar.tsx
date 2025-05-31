import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const NavBar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="nav-menu">
      <div className="container">
        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          <span className="hamburger"></span>
        </button>
        
        <div className={`nav-content ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-menu-left">
            <Link to="/" className="nav-link">All Surveys</Link>
            {isAuthenticated && (user?.role === 'creator' || user?.role === 'admin') && (
              <Link to="/create" className="nav-link">Create Survey</Link>
            )}
          </div>
          
          <div className="nav-menu-right">
            {isAuthenticated ? (
              <>
                <div className="user-info">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-role">({user?.role})</span>
                </div>
                <button onClick={logout} className="nav-button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;