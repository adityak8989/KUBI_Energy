import React, { useState, useMemo } from 'react';
import type { useDEX } from '../hooks/useDEX';
import Card from './shared/Card';

interface TradeFormProps {
  dex: ReturnType<typeof useDEX>;
}

const TradeForm: React.FC<TradeFormProps> = ({ dex }) => {
  const { currentUser, createOrder, balances, mpts } = dex;
  const isProsumer = currentUser.role === 'PROSUMER';
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const acceptedMpts = useMemo(() => mpts.filter(m => m.accepted && m.transferable).length, [mpts]);
  
  const total = useMemo(() => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    if (!isNaN(numAmount) && !isNaN(numPrice)) {
      return (numAmount * numPrice).toFixed(2);
    }
    return '0.00';
  }, [amount, price]);

  const isValid = () => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    
    if (isNaN(numAmount) || isNaN(numPrice) || numAmount <= 0 || numPrice <= 0) {
      return false;
    }
    
    // For OFFER (Prosumer selling), check we have enough MPTs
    if (isProsumer && acceptedMpts === 0) {
      return false;
    }
    
    // For BID (Consumer buying), check we have enough USD
    if (!isProsumer && balances.usd < numAmount * numPrice) {
      return false;
    }
    
    return true;
  };

  const getErrorMessage = () => {
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    
    if (isNaN(numAmount) || isNaN(numPrice)) {
      return 'Enter valid amount and price';
    }
    
    if (numAmount <= 0 || numPrice <= 0) {
      return 'Amount and price must be positive';
    }
    
    if (isProsumer && acceptedMpts === 0) {
      return `No Energy Tokens available to sell (you have ${acceptedMpts} MPTs)`;
    }
    
    const required = numAmount * numPrice;
    if (!isProsumer && balances.usd < required) {
      return `Insufficient USD balance. Need $${required.toFixed(2)}, have $${balances.usd.toFixed(2)}`;
    }
    
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) {
      alert(getErrorMessage());
      return;
    }
    
    const numAmount = parseFloat(amount);
    const numPrice = parseFloat(price);
    
    setIsSubmitting(true);
    try {
      await createOrder(isProsumer ? 'OFFER' : 'BID', numAmount, numPrice);
      setAmount('');
      setPrice('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-dex-gray-800 mb-2">
            {isProsumer ? 'Create Sell Offer' : 'Create Buy Bid'}
          </h3>
          <p className="text-sm text-dex-gray-600">
            {isProsumer 
              ? `You have ${acceptedMpts} Energy Token${acceptedMpts !== 1 ? 's' : ''} available to sell`
              : `Your USD Balance: $${balances.usd.toFixed(2)}`
            }
          </p>
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-dex-gray-700">
            {isProsumer ? 'Amount (ET/NFTs)' : 'Amount (ET)'}
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              className="bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600 focus:ring-dex-blue focus:border-dex-blue block w-full pl-4 pr-12 sm:text-sm border-dex-gray-300 rounded-md py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0.00"
              step={isProsumer ? "1" : "0.01"}
              min="0"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-dex-gray-500 sm:text-sm">{isProsumer ? 'NFTs' : 'ET'}</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-dex-gray-700">
            {isProsumer ? 'Price per NFT ($/ET)' : 'Price per ET ($/ET)'}
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-dex-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSubmitting}
              className="bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600 focus:ring-dex-blue focus:border-dex-blue block w-full pl-7 pr-2 sm:text-sm border-dex-gray-300 rounded-md py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0.00"
              step="0.0001"
              min="0"
            />
          </div>
        </div>
        
        <div className="border-t border-dex-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dex-gray-600">Total:</span>
              <span className="text-2xl font-bold text-dex-gray-800">${total}</span>
            </div>
            {!isProsumer && balances.usd < parseFloat(total || '0') && parseFloat(total || '0') > 0 && (
              <p className="text-xs text-red-600 mt-2">⚠️ Insufficient USD balance</p>
            )}
        </div>

        <button
          type="submit"
          disabled={!isValid() || isSubmitting}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all ${
            isProsumer 
              ? `${!isValid() || isSubmitting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}` 
              : `${!isValid() || isSubmitting ? 'bg-green-300 cursor-not-allowed' : 'bg-dex-green hover:bg-green-700'}`
          } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isProsumer ? 'focus:ring-red-500' : 'focus:ring-dex-green'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {isProsumer ? 'Creating Sell Offer...' : 'Creating Buy Bid...'}
            </>
          ) : (
            isProsumer ? 'Place Sell Offer' : 'Place Buy Bid'
          )}
        </button>
        
        {!isValid() && getErrorMessage() && (
          <p className="text-xs text-red-600 text-center mt-2">{getErrorMessage()}</p>
        )}
      </form>
    </Card>
  );
};

export default TradeForm;
