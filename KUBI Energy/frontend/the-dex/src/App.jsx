import React from 'react';
import Header from './components/Header.jsx'; 
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';

function App() {
  // In a real app, you'd use react-router-dom for navigation
  // For now, we'll just show one page at a time or toggle for demonstration
  const [currentPage, setCurrentPage] = React.useState('dashboard'); // 'dashboard' or 'marketplace'

  const renderPage = () => {
    if (currentPage === 'dashboard') {
      return <Dashboard />;
    } else if (currentPage === 'marketplace') {
      return <Marketplace />;
    }
    return <Dashboard />; // Default
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header setCurrentPage={setCurrentPage} /> {/* Pass setCurrentPage to Header for navigation */}
      <main className="container mx-auto p-4">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;