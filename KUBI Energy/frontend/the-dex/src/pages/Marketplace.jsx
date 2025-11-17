import React from 'react';
import OrderBook from '../components/OrderBook';
import TradingForm from '../components/TradingForm';

function Marketplace() {
  // In a real app, you'd fetch this data from your blockchain/backend
  const bids = [
    { price: '0.16', amount: '150', source: 'Solar_PV', time: '14:40' },
    { price: '0.15', amount: '200', source: 'Wind_Farm', time: '12:00' },
  ];

  const offers = [
    { price: '0.15', amount: '300', source: 'Solar_PV', time: '14:40' },
    { price: '0.17', amount: '100', source: 'Hydro', time: '11:00' },
  ];

  const handleTradeSubmit = (tradeType, data) => {
    console.log(`Submitting ${tradeType}:`, data);
    // Here you would integrate with your blockchain interaction logic
    alert(`Successfully submitted ${tradeType} for ${data.amount} ETs at $${data.price}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Real-time Order Book */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Real-time Order Book</h2>
        <div className="grid grid-cols-2 gap-4">
          <OrderBook title="Bids (Buy ET)" data={bids} type="bids" />
          <OrderBook title="Offers (Sell ET)" data={offers} type="offers" />
        </div>
      </div>

      {/* Create New Offer / Bid Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Create New Offer / Bid</h2>
        <TradingForm onSubmit={handleTradeSubmit} />
      </div>
    </div>
  );
}

export default Marketplace;