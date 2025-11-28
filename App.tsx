
import React, { useState } from 'react';
import { Header } from './components/Header';
import AuthPage from './components/AuthPage';
import VirtualTryOn from './components/VirtualTryOn';

interface User {
  name: string;
  email: string;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = () => {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('currentUser');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen text-gray-100 font-sans">
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} currentUser={currentUser} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthenticated ? (
          <div className="fade-in">
            <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8">
              <VirtualTryOn />
            </div>
          </div>
        ) : (
          <AuthPage onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
};

export default App;
