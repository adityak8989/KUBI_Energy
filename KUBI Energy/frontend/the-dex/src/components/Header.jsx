import React from 'react';

function Header({ setCurrentPage }) {
  return (
    <header className="bg-white shadow-md py-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center space-x-2">
          {/* DEX Logo */}
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">D</div>
          <h1 className="text-xl font-bold text-gray-800">DEX: P2P Energy Marketplace</h1>
        </div>

        <nav className="flex space-x-4">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="text-gray-600 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-150 ease-in-out"
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentPage('marketplace')}
            className="text-gray-600 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-150 ease-in-out"
          >
            Marketplace
          </button>
          {/* Add more navigation buttons as needed */}
          <button className="text-gray-600 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-150 ease-in-out">
            Wallet
          </button>
          <button className="text-gray-600 hover:text-blue-600 font-medium px-3 py-2 rounded-md transition duration-150 ease-in-out">
            Account
          </button>
        </nav>

        <div className="flex items-center space-x-2">
          <span className="text-gray-700 font-medium">Jane Doe (Prosumer)</span>
          <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Verified</span>
        </div>
      </div>
    </header>
  );
}

export default Header;