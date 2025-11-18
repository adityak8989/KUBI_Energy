import React from 'react';
import type { useDEX } from '../hooks/useDEX';
import OrderBook from './OrderBook';
import TradeForm from './TradeForm';

interface MarketplaceProps {
  dex: ReturnType<typeof useDEX>;
}

const Marketplace: React.FC<MarketplaceProps> = ({ dex }) => {
  const { marketOrders, executeTrade, orders, currentUser } = dex;
  const isProsumer = currentUser.role === 'PROSUMER';

  // Current user's open offers
  const mySellOffers = orders.filter(o => o.direction === 'sell').sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());

  // Current user's open bids
  const myBuyBids = orders.filter(o => o.direction === 'buy').sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {isProsumer ? (
          <>
            <OrderBook
              title="Market Buy Bids (Sell to these)"
              orders={marketOrders.bids}
              type="BID"
              onExecute={executeTrade}
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
              orders={marketOrders.offers}
              type="OFFER"
              onExecute={executeTrade}
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
