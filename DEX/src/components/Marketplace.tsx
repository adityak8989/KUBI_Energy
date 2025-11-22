import React from 'react';
import type { useDEX } from '../hooks/useDEX';
import OrderBook from './OrderBook';
import TradeForm from './TradeForm';
import Card from './shared/Card';

interface MarketplaceProps {
  dex: ReturnType<typeof useDEX>;
}

const Marketplace: React.FC<MarketplaceProps> = ({ dex }) => {
  const { marketOrders, executeTrade, orders, currentUser, mpts, balances } = dex;
  const isProsumer = currentUser.role === 'PROSUMER';

  // Current user's open offers
  const mySellOffers = orders.filter(o => o.direction === 'sell').sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());

  // Current user's open bids
  const myBuyBids = orders.filter(o => o.direction === 'buy').sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());

  // Count accepted/transferable MPTs
  const acceptedMpts = mpts.filter(m => m.accepted && m.transferable).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        
        {/* Show MPT Balance for Prosumers */}
        {isProsumer && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-dex-gray-800">Your MPT Energy Tokens</h3>
                <p className="text-sm text-dex-gray-600 mt-1">
                  {acceptedMpts} NFT{acceptedMpts !== 1 ? 's' : ''} ready to sell
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-dex-green">{acceptedMpts}</p>
                <p className="text-xs text-dex-gray-500">Transferable</p>
              </div>
            </div>
            {acceptedMpts > 0 && (
              <div className="mt-4 pt-4 border-t border-dex-gray-200">
                <p className="text-xs text-dex-gray-600 mb-2">Your NFT Details:</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {mpts.map((mpt, idx) => (
                    <div key={mpt.nftId} className="text-xs p-2 bg-dex-gray-50 rounded">
                      <p className="font-mono text-dex-gray-700 truncate">ID: {mpt.nftId.slice(0, 16)}...</p>
                      <p className="text-dex-gray-600">{mpt.metadata?.sourceType || 'Energy'} - {new Date(mpt.metadata?.generationTime || '').toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {isProsumer ? (
          <>
            <OrderBook
              title="Market Buy Bids (From Consumers)"
              orders={marketOrders.bids}
              type="BID"
              onExecute={executeTrade}
              currentUserId={currentUser.id}
            />
            
            {/* Show prosumer's own NFT listings only */}
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-dex-gray-800">My Listed Energy NFTs</h3>
              {/* Hardcoded demo listing for prosumer */}
              {currentUser.id === 'rDfNEueAZPPLhaC6HXjvTAmM9JzeEV5NrR' && (
                <div className="space-y-3 mb-3">
                  <div className="flex items-center justify-between p-4 border border-dex-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-dex-gray-800">Solar Energy NFT - Demo Listing</p>
                      <p className="text-xs text-dex-gray-600 mt-1 font-mono truncate">ID: 00010000A42F5B5E...</p>
                      <p className="text-xs text-dex-gray-600">
                        Generated: {new Date().toLocaleDateString()}
                      </p>
                      <p className="text-xs text-dex-gray-600 mt-1">
                        Location: Unknown
                      </p>
                      <p className="text-sm font-bold text-dex-green mt-2">
                        Price: 2.50 XRP (~$1.25)
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-xs text-dex-gray-600">Status</p>
                      <p className="text-sm font-semibold text-dex-green">Listed</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Real marketplace listings from blockchain */}
              {!dex.marketplaceNFTOffers || dex.marketplaceNFTOffers.filter(o => o.seller === currentUser.id).length === 0 ? (
                currentUser.id !== 'rDfNEueAZPPLhaC6HXjvTAmM9JzeEV5NrR' && (
                  <p className="text-sm text-dex-gray-500">You don't have any Energy NFTs listed yet. Mint energy on the Dashboard to create listings.</p>
                )
              ) : (
                <div className="space-y-3">
                  {dex.marketplaceNFTOffers
                    .filter(o => o.seller === currentUser.id)
                    .map((listing) => (
                      <div key={`${listing.nftId}-${listing.sellOfferIndex}`} className="flex items-center justify-between p-4 border border-dex-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-dex-gray-800">{listing.metadata?.sourceType || 'Energy'} NFT</p>
                          <p className="text-xs text-dex-gray-600 mt-1 font-mono truncate">ID: {listing.nftId.slice(0, 20)}...</p>
                          <p className="text-xs text-dex-gray-600">
                            Generated: {listing.metadata?.generationTime ? new Date(listing.metadata.generationTime).toLocaleDateString() : 'Unknown'}
                          </p>
                          <p className="text-xs text-dex-gray-600 mt-1">
                            Location: {listing.metadata?.geoLocation || 'Unknown'}
                          </p>
                          <p className="text-sm font-bold text-dex-green mt-2">
                            Price: {(parseInt(listing.amount || '0') / 1000000).toFixed(2)} XRP (~${(parseInt(listing.amount || '0') / 1000000 * 0.5).toFixed(2)})
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-xs text-dex-gray-600">Status</p>
                          <p className="text-sm font-semibold text-dex-green">Listed</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </>
        ) : (
          <>
            <OrderBook
              title="Market Sell Offers (From Prosumers)"
              orders={marketOrders.offers}
              type="OFFER"
              onExecute={executeTrade}
              currentUserId={currentUser.id}
            />
            <OrderBook
              title="My Active Purchase Offers"
              orders={myBuyBids}
              type="BID"
              onExecute={() => {}} // No action on my own orders
              currentUserId={currentUser.id}
              defaultOpen={false}
            />
          </>
        )}
        
        <Card>
          <h3 className="text-lg font-semibold mb-3 text-dex-gray-800">Energy NFT Listings</h3>
          
          {/* Hardcoded Demo Listing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-dex-gray-200 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 hover:shadow-md transition-shadow">
              <div className="flex-1">
                <p className="text-sm font-semibold text-dex-gray-800">Solar Energy NFT - Demo Listing</p>
                <p className="text-xs text-dex-gray-600 mt-1">
                  Seller: <span className="font-mono">rDfNEueAZPPLh...</span>
                </p>
                <p className="text-xs text-dex-gray-600">
                  Generated: {new Date().toLocaleDateString()}
                </p>
                <p className="text-sm font-bold text-dex-green mt-2">
                  Price: 1.00 XRP (~$0.50)
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={async () => {
                    if (!currentUser || currentUser.role !== 'CONSUMER') {
                      alert('Only consumers can purchase energy NFTs. Please switch to consumer account.');
                      return;
                    }
                    
                    if (!confirm('Purchase this Solar Energy NFT for 1.00 XRP?')) return;
                    
                    try {
                      // Hardcoded wallets for demo
                      const prosumerAddress = 'rDfNEueAZPPLhaC6HXjvTAmM9JzeEV5NrR'; // Prosumer
                      const nftId = '00010000A42F5B5E8F6B9C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F'; // Demo NFT ID (64 hex chars)
                      const priceDrops = '1000000'; // 1 XRP in drops
                      
                      console.log('Creating buy offer for demo listing:', {
                        consumer: currentUser.id,
                        prosumer: prosumerAddress,
                        nftId,
                        priceDrops
                      });
                      
                      // Create buy offer using the DEX hook
                      const result = await dex.createBuyOfferForNFT(prosumerAddress, nftId, priceDrops);
                      
                      if ((result as any)?.error) {
                        alert(`Purchase failed: ${(result as any).error}`);
                      } else {
                        alert('✓ Purchase offer created! The prosumer can now accept your offer.');
                        await dex.refreshData(currentUser.id);
                      }
                    } catch (err) {
                      console.error('Purchase error:', err);
                      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }}
                  disabled={currentUser.role !== 'CONSUMER'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentUser.role === 'CONSUMER'
                      ? 'bg-dex-green text-white hover:bg-green-600'
                      : 'bg-dex-gray-200 text-dex-gray-500 cursor-not-allowed'
                  }`}
                >
                  {currentUser.role === 'CONSUMER' ? 'Buy NFT' : 'Consumers Only'}
                </button>
              </div>
            </div>

            {/* Show other marketplace offers if any */}
            {dex.marketplaceNFTOffers && dex.marketplaceNFTOffers.length > 0 && (
              <>
                <div className="border-t border-dex-gray-200 my-3 pt-3">
                  <p className="text-xs text-dex-gray-500 mb-2">Other Listings:</p>
                </div>
                {dex.marketplaceNFTOffers.map((o: any) => (
                  <div key={`${o.nftId}-${o.sellOfferIndex}`} className="flex items-center justify-between p-4 border border-dex-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-dex-gray-800">{o.metadata?.sourceType || 'Energy Token'} NFT</p>
                      <p className="text-xs text-dex-gray-600 mt-1">
                        Seller: <span className="font-mono">{o.seller?.slice(0, 10)}...</span>
                      </p>
                      <p className="text-xs text-dex-gray-600">
                        Generated: {o.metadata?.generationTime ? new Date(o.metadata.generationTime).toLocaleString() : 'Unknown'}
                      </p>
                      <p className="text-sm font-bold text-dex-green mt-2">
                        Price: {(parseInt(o.amount || '0') / 1000000).toFixed(2)} XRP (~${(parseInt(o.amount || '0') / 1000000 * 0.5).toFixed(2)})
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={async () => {
                          if (!confirm(`Purchase this energy NFT for ${(parseInt(o.amount || '0') / 1000000).toFixed(2)} XRP?`)) return;
                          const res = await dex.buyNFTOffer(o.sellOfferIndex, o.nftId);
                          if ((res as any)?.error) {
                            alert(`Purchase failed: ${(res as any).error}`);
                          } else {
                            alert('Purchase submitted! Refreshing marketplace...');
                            await dex.refreshMarketplaceNFTOffers();
                          }
                        }}
                        className="px-4 py-2 bg-dex-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        Buy NFT
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <TradeForm dex={dex} />
        
        {/* Show balance warning if low on tokens */}
        {isProsumer && acceptedMpts === 0 && (
          <Card>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <p className="text-sm font-semibold text-yellow-800">⚠️ No Energy Tokens</p>
              <p className="text-xs text-yellow-700 mt-1">
                Mint Energy Tokens on the Dashboard to start selling on the marketplace.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
