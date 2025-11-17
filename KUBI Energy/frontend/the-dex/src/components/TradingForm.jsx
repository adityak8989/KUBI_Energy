import React, { useState } from 'react';

function TradingForm({ onSubmit }) {
  const [tradeType, setTradeType] = useState('offer'); // 'offer' or 'bid'
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [sourceType, setSourceType] = useState('Solar_PV'); // Default
  const [generationTime, setGenerationTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !price || !sourceType || !generationTime) {
      alert('Please fill in all fields.');
      return;
    }
    onSubmit(tradeType, { amount, price, sourceType, generationTime });
    // Reset form
    setAmount('');
    setPrice('');
    setGenerationTime('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Trade Type Selection */}
      <div className="flex space-x-4 mb-4">
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="tradeType"
            value="offer"
            checked={tradeType === 'offer'}
            onChange={() => setTradeType('offer')}
            className="form-radio text-blue-600 h-4 w-4"
          />
          <span className="ml-2 text-gray-700">Sell ET (Offer)</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="tradeType"
            value="bid"
            checked={tradeType === 'bid'}
            onChange={() => setTradeType('bid')}
            className="form-radio text-green-600 h-4 w-4"
          />
          <span className="ml-2 text-gray-700">Buy ET (Bid)</span>
        </label>
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (ET)</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g., 50"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
      </div>

      {/* Price Input */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price/kWh (USD)</label>
        <input
          type="number"
          step="0.01"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 0.15"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
      </div>

      {/* Source Type Select */}
      <div>
        <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700">Source Type</label>
        <select
          id="sourceType"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          required
        >
          <option value="Solar_PV">Solar_PV</option>
          <option value="Wind_Farm">Wind_Farm</option>
          <option value="Hydro">Hydro</option>
          {/* Add more source types as needed */}
        </select>
      </div>

      {/* Generation Time Input */}
      <div>
        <label htmlFor="generationTime" className="block text-sm font-medium text-gray-700">Generation Time (e.g., 2025-11-14T14:30:00Z)</label>
        <input
          type="text" // Use datetime-local or similar for better UX
          id="generationTime"
          value={generationTime}
          onChange={(e) => setGenerationTime(e.target.value)}
          placeholder="YYYY-MM-DDTHH:MM:SSZ"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          required
        />
      </div>

      <button
        type="submit"
        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          tradeType === 'offer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          tradeType === 'offer' ? 'focus:ring-blue-500' : 'focus:ring-green-500'
        }`}
      >
        Submit {tradeType === 'offer' ? 'Offer' : 'Bid'}
      </button>
    </form>
  );
}

export default TradingForm;