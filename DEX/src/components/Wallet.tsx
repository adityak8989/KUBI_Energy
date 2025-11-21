import React from 'react';
import type { useDEX } from '../hooks/useDEX';
import TransactionHistory from './TransactionHistory';
import Card from './shared/Card';
import { ET_Logo, USD_Logo } from './IconComponents';

interface WalletProps {
  dex: ReturnType<typeof useDEX>;
}

const Wallet: React.FC<WalletProps> = ({ dex }) => {
  const { currentUser, transactions, balances, mpts, createNFTSellOffer, convertUsdToDrops } = dex as any;
  
  if (!currentUser) return <div>Loading wallet...</div>;

  // Modal state for selling
  const [sellModalOpen, setSellModalOpen] = React.useState(false);
  const [modalNft, setModalNft] = React.useState<any | null>(null);
  const [modalPriceUsd, setModalPriceUsd] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const openSellModal = (nft: any) => {
    setModalNft(nft);
    setModalPriceUsd('');
    setSellModalOpen(true);
  };

  const closeSellModal = () => {
    setSellModalOpen(false);
    setModalNft(null);
    setModalPriceUsd('');
  };

  const confirmSellModal = async () => {
    if (!modalNft) return;
    const usd = parseFloat(modalPriceUsd);
    if (isNaN(usd) || usd <= 0) { alert('Enter a valid USD price.'); return; }
    setIsSubmitting(true);
    try {
      // Use hook conversion by passing USD marker; hook will convert to drops server-side
      await createNFTSellOffer(modalNft.hash, `USD:${usd}`);
      closeSellModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptedMpts = mpts.filter((m: any) => m.accepted && m.transferable).length;
  const processingMpts = mpts.length - acceptedMpts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                    <ET_Logo className="h-8 w-8 text-dex-green"/>
                </div>
                <div>
                    <p className="text-sm font-medium text-dex-gray-500">Energy Token Balance</p>
                    <p className="text-3xl font-bold text-dex-gray-800">{balances.et.toFixed(2)} ET</p>
                </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                    <USD_Logo className="h-8 w-8 text-dex-blue"/>
                </div>
                <div>
                    <p className="text-sm font-medium text-dex-gray-500">Stablecoin Balance</p>
                    <p className="text-3xl font-bold text-dex-gray-800">${balances.usd.toFixed(2)}</p>
                </div>
            </div>
          </Card>
      </div>

      <Card>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">My Energy Tokens (MPTs)</h3>
            {mpts && mpts.length > 0 && (
              <span className="text-sm bg-dex-gray-100 px-3 py-1 rounded-full text-dex-gray-700 font-semibold">
                {mpts.length} total
              </span>
            )}
          </div>
          
          {(!mpts || mpts.length === 0) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-semibold">No Energy Tokens Yet</p>
              <p className="text-xs text-yellow-700 mt-1">Mint NFT Energy Tokens on the Dashboard to start trading on the marketplace.</p>
            </div>
          )}
          
          {mpts && mpts.length > 0 && (
            <>
              {acceptedMpts > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">✓ {acceptedMpts} Ready to Trade</p>
                  <p className="text-xs text-green-700">These Energy Tokens can be sold on the marketplace.</p>
                </div>
              )}
              
              {processingMpts > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">⏳ {processingMpts} Processing</p>
                  <p className="text-xs text-yellow-700">Waiting for blockchain confirmation...</p>
                </div>
              )}

              <div className="space-y-3">
                {mpts && mpts.map((m: any) => (
                  <div key={m.hash} className="flex items-start justify-between p-4 border border-dex-gray-200 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">
                          {m.metadata?.sourceType === 'Solar_PV' ? '☀️' : m.metadata?.sourceType === 'Wind_Farm' ? '💨' : '⚡'}
                        </span>
                        <p className="text-sm font-semibold text-dex-gray-800">{m.metadata?.sourceType || 'Energy Token'}</p>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          m.transferable && m.accepted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {m.transferable && m.accepted ? '✓ Ready' : 'Processing'}
                        </span>
                      </div>
                      <p className="text-xs text-dex-gray-600 font-mono truncate mb-2">
                        ID: {m.hash}
                      </p>
                      <div className="text-xs text-dex-gray-600 space-y-1">
                        <p>📅 {new Date(m.metadata?.generationTime || '').toLocaleString()}</p>
                        {m.metadata?.geoLocation && <p>📍 {m.metadata.geoLocation}</p>}
                        {m.metadata?.certificateId && <p>🔐 Cert: {m.metadata.certificateId}</p>}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button 
                        onClick={() => openSellModal(m)}
                        disabled={!m.transferable || !m.accepted}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          m.transferable && m.accepted
                            ? 'bg-dex-blue text-white hover:bg-blue-700'
                            : 'bg-dex-gray-200 text-dex-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {m.transferable && m.accepted ? 'Sell' : 'Pending'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {sellModalOpen && modalNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Sell Energy Token</h3>
            
            <div className="mb-4 p-3 bg-dex-gray-50 rounded-lg">
              <p className="text-xs text-dex-gray-600 mb-1">Token Details</p>
              <p className="text-sm font-mono text-dex-gray-700">{modalNft.nftId}</p>
              <p className="text-xs text-dex-gray-600 mt-1">
                {modalNft.metadata?.sourceType} - {new Date(modalNft.metadata?.generationTime || '').toLocaleString()}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-dex-gray-700 mb-1">Price (USD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dex-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={modalPriceUsd}
                  onChange={(e) => setModalPriceUsd(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-7 pr-3 py-2 border border-dex-gray-300 rounded-md focus:ring-dex-blue focus:border-dex-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              {modalPriceUsd && !isNaN(parseFloat(modalPriceUsd)) && (
                <p className="text-xs text-dex-gray-500 mt-2">
                  ≈ {convertUsdToDrops(parseFloat(modalPriceUsd))} drops
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button 
                onClick={closeSellModal}
                disabled={isSubmitting}
                className="px-4 py-2 border border-dex-gray-300 rounded-md text-dex-gray-700 font-medium hover:bg-dex-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSellModal}
                disabled={isSubmitting || !modalPriceUsd || parseFloat(modalPriceUsd) <= 0}
                className="px-4 py-2 bg-dex-blue text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Sell Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionHistory transactions={transactions} currentUserId={currentUser.id} />
    </div>
  );
};

export default Wallet;
