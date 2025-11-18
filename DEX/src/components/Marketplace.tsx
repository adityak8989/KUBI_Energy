
import React from 'react';
import type { useDEX } from '../hooks/useDEX';
import OrderBook from './OrderBook';
import TradeForm from './TradeForm';

interface MarketplaceProps {
  dex: ReturnType<typeof useDEX>;
}

const Marketplace: React.FC<MarketplaceProps> = ({ dex }) => {
  const { orders, executeTrade, currentUser } = dex;
  const isProsumer = currentUser.role === 'PROSUMER';

  // All open offers from others, sorted by lowest price
  const sellOffers = orders.filter(o => o.type === 'OFFER' && o.userId !== currentUser.id).sort((a, b) => a.price - b.price);
  
  // All open bids from others, sorted by highest price
  const buyBids = orders.filter(o => o.type === 'BID' && o.userId !== currentUser.id).sort((a, b) => b.price - a.price);

  // Current user's open offers
  const mySellOffers = orders.filter(o => o.type === 'OFFER' && o.userId === currentUser.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Current user's open bids
  const myBuyBids = orders.filter(o => o.type === 'BID' && o.userId === currentUser.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {isProsumer ? (
          <>
            <OrderBook
              title="Market Buy Bids (Sell to these)"
              orders={buyBids}
              type="BID"
              onExecute={(order) => executeTrade(order.userId, currentUser.id, order)}
              currentUserId={currentUser.id}
            />
            <OrderBook
              title="My Active Sell Offers"
              orders={mySellOffers}
              type="OFFER"
              onExecute={() => {}} // No action on my own orders
              currentUserId={currentUser.id}
              defaultOpen={false}
            />
          </>
        ) : (
          <>
            <OrderBook
              title="Market Sell Offers (Buy from these)"
              orders={sellOffers}
              type="OFFER"
              onExecute={(order) => executeTrade(currentUser.id, order.userId, order)}
              currentUserId={currentUser.id}
            />
            <OrderBook
              title="My Active Buy Bids"
              orders={myBuyBids}
              type="BID"
              onExecute={() => {}} // No action on my own orders
              currentUserId={currentUser.id}
              defaultOpen={false}
            />
          </>
        )}
      </div>
      <div className="lg:col-span-1">
        <TradeForm dex={dex} />
      </div>
    </div>
  );
};

export default Marketplace;