import React, { useState, useMemo } from 'react';
import type { useDEX } from '../hooks/useDEX';
import Card from './shared/Card';

interface TradeFormProps {
  dex: ReturnType<typeof useDEX>;
}

const TradeForm: React.FC<TradeFormProps> = ({ dex }) => {
  const { currentUser, createOrder } = dex;
  const isProsumer = currentUser.role === 'PROSUMER';
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  
  const total = useMemo(() => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    if (!isNaN(numAmount) && !isNaN(numPrice)) {
      return (numAmount * numPrice).toFixed(2);
    }
    return '0.00';
  }, [amount, price]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    if (!isNaN(numAmount) && !isNaN(numPrice) && numAmount > 0 && numPrice > 0) {
      createOrder(isProsumer ? 'OFFER' : 'BID', numAmount, numPrice);
      setAmount('');
      setPrice('');
    } else {
      alert('Please enter valid amount and price.');
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-bold text-dex-gray-800">
          {isProsumer ? 'Create Sell Offer' : 'Create Buy Bid'}
        </h3>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-dex-gray-700">Amount (ET)</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600 focus:ring-dex-blue focus:border-dex-blue block w-full pl-4 pr-12 sm:text-sm border-dex-gray-300 rounded-md py-2"
              placeholder="0.00"
              step="0.01"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-dex-gray-500 sm:text-sm">ET</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-dex-gray-700">Price ($/ET)</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-dex-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600 focus:ring-dex-blue focus:border-dex-blue block w-full pl-7 pr-2 sm:text-sm border-dex-gray-300 rounded-md py-2"
              placeholder="0.00"
              step="0.0001"
            />
          </div>
        </div>
        
        <div className="border-t border-dex-gray-200 pt-4">
            <div className="flex justify-between items-center text-lg font-semibold text-dex-gray-800">
                <span>Total</span>
                <span>${total}</span>
            </div>
        </div>

        <button
          type="submit"
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isProsumer ? 'bg-red-500 hover:bg-red-600' : 'bg-dex-green hover:bg-green-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isProsumer ? 'focus:ring-red-500' : 'focus:ring-dex-green'
          }`}
        >
          {isProsumer ? 'Place Sell Offer' : 'Place Buy Bid'}
        </button>
      </form>
    </Card>
  );
};

export default TradeForm;
