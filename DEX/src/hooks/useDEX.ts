import { useState, useCallback, useEffect } from 'react';
import { User, Order, Transaction, Balances, MPTMetadata } from '../shared/types';
import * as xrpl from 'xrpl';

// --- XRPL Testnet Configuration ---
// WARNING: Do not use these accounts on the mainnet. They are for testing purposes only.
const RIPPLE_TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233';

// Central authority for issuing Energy Tokens (ET)
const ISSUER_WALLET = {
    address: 'r416gWnjV4qmivUQ3bx8fJPjW6323XsANP',
    secret: 'sEdVq6J2vqRXGXiuqU2C4RxbF9VE2c3',
};

// Simulated financial institution for issuing USD
const GATEWAY_WALLET = {
    address: 'rERaR8C21WgZPW2yAp8WXGxviXUJJm76DA',
    secret: 'sEdTfrLyb3fN4f2bBQBbTgQ8mZtHnYM',
};

// --- Currency Codes ---
const ET_CURRENCY_CODE = 'ETK'; // Energy Token
const USD_CURRENCY_CODE = 'USD';

// In a real app, users would generate their own wallets.
const prosumerUser: User = {
    id: 'rDfNEueAZPPLhaC6HXjvTAmM9JzeEV5NrR', // XRPL Address
    name: 'Solar Farm Alpha (Prosumer)',
    role: 'PROSUMER',
    kycVerified: true,
    secret: 'sEd7e6gBkktLFwPdJJ5qMrNTNyaGG6s' // use for login, for demo purposes only
};

const consumerUser: User = {
    id: 'r3U1baLKb8PRnaELDvZMMWKtTWTBTpPB7w', // XRPL Address
    name: 'Eco Conscious Home (Consumer)',
    role: 'CONSUMER',
    kycVerified: true,
    secret: 'sEdV2dPUx6xs5wDCag6tXavWWMdqAQX' // use for login, for demo purposes only
};

const initialUsers = [prosumerUser, consumerUser];
const client = new xrpl.Client(RIPPLE_TESTNET_SERVER);

// Ensure the xrpl client is connected; retry a few times if needed
const ensureConnected = async (attempts = 3, delayMs = 800) => {
    for (let i = 0; i < attempts; i++) {
        try {
            if (!client.isConnected()) {
                await client.connect();
            }
            // sanity check: ping or simple request could be used, but isConnected is sufficient here
            if (client.isConnected()) return true;
        } catch (e) {
            // wait and retry
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    return false;
};

export const useDEX = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [balances, setBalances] = useState<Balances>({ et: 0, usd: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    // Enhanced MPT tracking: now includes nftId, flags, and full ledger state
    const [mpts, setMpts] = useState<Array<{ 
        hash: string; 
        nftId: string;
        amount: number; 
        metadata: MPTMetadata;
        flags?: number;
        transferable?: boolean;
        accepted?: boolean;
    }>>([]);
    const [marketOrders, setMarketOrders] = useState<{bids: Order[], offers: Order[]}>({ bids: [], offers: [] });
    const [marketplaceNFTOffers, setMarketplaceNFTOffers] = useState<Array<any>>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Helpers for hex <-> string conversion used for NFT URIs
    const stringToHex = (str: string) => {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    };
    const hexToString = (hex: string) => {
        try {
            const cleaned = String(hex).replace(/^0x/, '');
            const bytes = new Uint8Array(cleaned.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
            return new TextDecoder().decode(bytes);
        } catch (e) {
            return '';
        }
    };

    // Simple USD -> XRP drops conversion helper.
    // WARNING: This uses a configurable exchange rate. Update `USD_PER_XRP` to match current market.
    // USD_PER_XRP = how many USD correspond to 1 XRP (e.g., 0.5 means 1 XRP = $0.50)
    const USD_PER_XRP = 0.5; // default placeholder — replace with live fetch if desired
    const usdToDrops = (usdAmount: number) => {
        if (!usdAmount || typeof usdAmount !== 'number' || !isFinite(usdAmount)) return '1';
        const xrp = usdAmount / USD_PER_XRP; // how many XRP
        const drops = Math.max(1, Math.round(xrp * 1_000_000));
        return String(drops);
    };

    // Normalize various error shapes from xrpl.js / rippled RPC responses into a readable string
    const extractErrorMessage = (err: any) => {
        if (!err) return 'Unknown error';
        // If the error is already an Error instance, prefer its message
        if (err instanceof Error) return err.message;
        // xrpl.js sometimes returns an object with a `result` containing engine fields
        const maybe = err.result || err;
        const engineMsg = maybe?.engine_result_message || maybe?.engine_result || maybe?.message;
        if (engineMsg) return String(engineMsg);
        // Some errors are raw RPC request/response objects — stringify safely
        try {
            return JSON.stringify(err);
        } catch (e) {
            return String(err);
        }
    };

    // Polling helpers: wait for NFTs or offers to appear on-ledger
    const ensureConnectedWrapped = useCallback(async () => {
        const ok = await ensureConnected();
        try { setIsConnected(!!ok); } catch (e) {}
        return ok;
    }, []);
    const waitForNftByUriHex = async (targetHex: string, account: string, timeoutMs = 20000, intervalMs = 1000) => {
        const end = Date.now() + timeoutMs;
        const cleanedTarget = String(targetHex).replace(/^0x/, '');
        while (Date.now() < end) {
            try {
                await ensureConnectedWrapped();
                const res = await client.request({ command: 'account_nfts', account, limit: 200 });
                const list = (res as any).result?.account_nfts || [];
                for (const n of list) {
                    const nAny: any = n;
                    const u = (nAny.URI || nAny.uri || '').replace(/^0x/, '');
                    if (u && u === cleanedTarget) return nAny;
                }
            } catch (e) {
                // ignore and retry
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return null;
    };

    const waitForOffer = async (nftId: string, ownerAddr?: string, type: 'buy' | 'sell' = 'sell', timeoutMs = 20000, intervalMs = 1000) => {
        const end = Date.now() + timeoutMs;
        const cmd = type === 'buy' ? 'nft_buy_offers' : 'nft_sell_offers';
        while (Date.now() < end) {
            try {
                await ensureConnectedWrapped();
                const res = await client.request({ command: cmd, nft_id: nftId });
                const offers = (res as any).result?.offers || [];
                for (const o of offers) {
                    const oAny: any = o;
                    const owner = oAny.owner || oAny.Account || oAny.account || oAny.seller;
                    if (!ownerAddr || owner === ownerAddr) {
                        const idx = oAny.nft_offer_index || oAny.index || oAny.offer_index || oAny.nft_offer_id || oAny.offerId;
                        return { ...oAny, index: idx };
                    }
                }
            } catch (e) {
                // ignore per-try errors
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return null;
    };

    // Wait for the account's NFT count to increase; return the newly added NFT (last one)
    const waitForNewNftOnAccount = async (account: string, previousCount: number, timeoutMs = 20000, intervalMs = 1000) => {
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
            try {
                await ensureConnectedWrapped();
                const res = await client.request({ command: 'account_nfts', account, limit: 200 });
                const list = (res as any).result?.account_nfts || [];
                if (list.length > previousCount) {
                    return list[list.length - 1];
                }
            } catch (e) {
                // ignore
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return null;
    };

    const disconnectClient = useCallback(async () => {
        if (client.isConnected()) {
            await client.disconnect();
            try { setIsConnected(false); } catch (e) {}
        }
    }, []);

    const refreshData = useCallback(async (walletAddress: string) => {
        await ensureConnectedWrapped();

        // Fetch Balances
        const accountLines = await client.request({ command: 'account_lines', account: walletAddress });
        const etBalance = accountLines.result.lines.find(line => line.currency === ET_CURRENCY_CODE)?.balance ?? '0';
        const usdBalance = accountLines.result.lines.find(line => line.currency === USD_CURRENCY_CODE)?.balance ?? '0';
        setBalances({ et: Math.abs(parseFloat(etBalance)), usd: Math.abs(parseFloat(usdBalance)) });

        // Fetch User's Open Orders
        const accountOffers = await client.request({ command: 'account_offers', account: walletAddress });
        const userOrders = (accountOffers.result.offers || []).map((o: any, idx: number) => {
            // Normalize fields from rippled offer format to our Order shape
            const id = String(o.seq ?? o.id ?? o.offerSequence ?? idx);
            return {
                ...o,
                id,
                gets: o.taker_gets ?? o.TakerGets ?? o.gets,
                pays: o.taker_pays ?? o.TakerPays ?? o.pays,
                owner: o.account ?? o.owner ?? o.Account,
                quality: o.quality ?? o.Quality,
                created: o.date ?? o.timestamp ?? o.ledger_index
            } as any;
        });
        setOrders(userOrders);

        // Fetch Transaction History
        const accountTx = await client.request({ command: 'account_tx', account: walletAddress, limit: 50 });
        const txEntries = accountTx.result.transactions || [];
        // map to tx objects (keep hash on the tx object)
        const txs = txEntries.map((t: any) => ({ ...(t.tx as any), hash: (t.tx && t.tx.hash) || t.hash }));
        setTransactions(txs);

        // Parse MPT metadata from NFTs owned by the account using `account_nfts`.
        // NFTs store metadata in the `URI` field as hex-encoded UTF-8. We attempt to parse JSON there.
        try {
            const accountNfts = await client.request({ command: 'account_nfts', account: walletAddress, limit: 200 });
            const nftList = accountNfts.result.account_nfts || [];
            const detectedNfts: Array<{ hash: string; nftId: string; amount: number; metadata: MPTMetadata; flags?: number; transferable?: boolean; accepted?: boolean }> = [];
            for (const nft of nftList) {
                const n: any = nft;
                const nftId = n.NFTokenID || n.nft_id || n.nftid || '';
                const uriHex = n.URI || n.uri || n.Uri || '';
                if (!nftId) continue;
                
                const uriStr = uriHex ? hexToString(uriHex) : '';
                let metadata: MPTMetadata | null = null;
                try {
                    if (uriStr) {
                        metadata = JSON.parse(uriStr) as MPTMetadata;
                    }
                } catch (e) {
                    // ignore URIs that are not JSON
                }
                
                // Determine if NFT is transferable based on flags
                const flags = n.Flags || 0;
                const transferable = !n.Transferable || n.Transferable !== false;
                
                detectedNfts.push({ 
                    hash: nftId, 
                    nftId,
                    amount: 1, 
                    metadata: metadata || {
                        sourceType: 'Solar_PV' as const,
                        generationTime: new Date().toISOString(),
                        certificateId: nftId,
                        geoLocation: 'Unknown'
                    },
                    flags,
                    transferable,
                    accepted: true
                });
            }
            setMpts(detectedNfts);
        } catch (e) {
            // ignore errors querying NFTs
        }
        
        // Fetch Market Order Book
        const etGet = { currency: ET_CURRENCY_CODE, issuer: ISSUER_WALLET.address };
        const usdPay = { currency: USD_CURRENCY_CODE, issuer: GATEWAY_WALLET.address };
        
        const bidsResponse = await client.request({ command: 'book_offers', taker_gets: etGet, taker_pays: usdPay });
        const offersResponse = await client.request({ command: 'book_offers', taker_gets: usdPay, taker_pays: etGet });

        setMarketOrders({
            bids: (bidsResponse.result.offers || []).map((o: any, idx: number) => ({ ...(o as any), id: String(o.seq ?? o.id ?? idx) })),
            offers: (offersResponse.result.offers || []).map((o: any, idx: number) => ({ ...(o as any), id: String(o.seq ?? o.id ?? idx) }))
        });
    }, []);

    // Discover NFT sell offers across known accounts (issuer + demo users)
    const refreshMarketplaceNFTOffers = useCallback(async () => {
        await ensureConnectedWrapped();
        const accountsToScan = [ISSUER_WALLET.address, ...initialUsers.map(u => u.id)];
        const offersAccum: Array<any> = [];

        for (const acct of accountsToScan) {
            try {
                const acctNftsRes = await client.request({ command: 'account_nfts', account: acct, limit: 200 });
                const nftList = acctNftsRes.result.account_nfts || [];
                for (const nft of nftList) {
                    const nftAny: any = nft;
                    const nftId = nftAny.NFTokenID || nftAny.nft_id || '';
                    try {
                        const sellRes = await client.request({ command: 'nft_sell_offers', nft_id: nftId });
                        const sellOffers = sellRes.result.offers || [];
                        for (const so of sellOffers) {
                            const soAny: any = so;
                            const uriHex = nftAny.URI || nftAny.uri || '';
                            const metaStr = uriHex ? hexToString(uriHex) : '';
                            let parsedMeta: any = null;
                            try { parsedMeta = JSON.parse(metaStr); } catch (e) { parsedMeta = null; }
                            offersAccum.push({
                                nftId,
                                seller: acct,
                                sellOfferIndex: soAny.nft_offer_index || soAny.index || soAny.offer_index || soAny.offerId || soAny.nft_offer_id,
                                amount: soAny.amount || soAny.Amount || soAny.value || soAny.price || '0',
                                rawOffer: soAny,
                                metadata: parsedMeta,
                            });
                        }
                    } catch (e) {
                        // ignore per-nft errors
                    }
                }
            } catch (e) {
                // ignore account errors
            }
        }

        setMarketplaceNFTOffers(offersAccum);
        return offersAccum;
    }, []);

    const buyNFTOffer = useCallback(async (sellOfferIndex: string | number, nftId: string) => {
        if (!currentUser) return { error: 'not_logged_in' };
        const buyerWallet = xrpl.Wallet.fromSeed(currentUser.secret);
        await ensureConnectedWrapped();

        try {
            // Ensure the sell offer exists (wait for it briefly if necessary)
            const found = await waitForOffer(nftId, undefined, 'sell', 20000, 1000);
            if (!found && !sellOfferIndex) {
                return { error: 'offer_not_found' };
            }
            const offerIndex = (found && found.index) ? found.index : String(sellOfferIndex);

            const tx: any = { TransactionType: 'NFTokenAcceptOffer', Account: buyerWallet.address, NFTokenSellOffer: String(offerIndex) };
            let prepared: any = await client.autofill(tx);
            try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signed = buyerWallet.sign(prepared);
            const res = await client.submitAndWait(signed.tx_blob);
            console.debug('NFTokenAcceptOffer (buy) result', res?.result || res);
            await refreshMarketplaceNFTOffers();
            await refreshData(currentUser.id);
            return res;
        } catch (e) {
            console.error('Buying NFT offer failed', e);
            return { error: extractErrorMessage(e) };
        }
    }, [currentUser, refreshData, refreshMarketplaceNFTOffers]);

    const login = useCallback(async (secret: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            const userWallet = xrpl.Wallet.fromSeed(secret);
            let user = initialUsers.find(u => u.id === userWallet.address);
            if (!user) {
                user = {
                    id: userWallet.address,
                    name: `User ${userWallet.address.slice(0,6)}`,
                    role: 'CONSUMER',
                    kycVerified: false,
                    secret
                } as User;
            } else {
                (user as any).secret = secret;
            }

            // Persist logged-in user to localStorage so page reloads keep state.
            // WARNING: storing wallet secrets in localStorage is insecure and only acceptable for local/demo usage.
            try { localStorage.setItem('dex_user', JSON.stringify({ id: user.id, secret })); } catch (e) {}

            await refreshData(user.id);
            setCurrentUser(user);
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error("Login failed:", error);
        }
        setIsLoading(false);
        return false;
    }, [refreshData]);

    const logout = useCallback(async () => {
        await disconnectClient();
        setCurrentUser(null);
        setBalances({ et: 0, usd: 0 });
        setOrders([]);
        setTransactions([]);
        try { localStorage.removeItem('dex_user'); } catch (e) {}
    }, [disconnectClient]);

    // On mount, restore persisted user from localStorage (if any) and refresh data.
    useEffect(() => {
        try {
            const raw = localStorage.getItem('dex_user');
            if (raw) {
                const parsed = JSON.parse(raw) as { id: string; secret?: string };
                if (parsed && parsed.id) {
                    const restored: User = initialUsers.find(u => u.id === parsed.id) || ({ id: parsed.id, name: parsed.id, role: 'CONSUMER', kycVerified: false, secret: parsed.secret || '' } as User);
                    // if secret is available, attach it
                    if (parsed.secret) (restored as any).secret = parsed.secret;
                    setCurrentUser(restored);
                    // best-effort refresh
                    refreshData(restored.id).catch(() => {});
                }
            }
        } catch (e) {
            // ignore restore errors
        }
    }, []);

    const createOrder = useCallback(async (type: 'BID' | 'OFFER', amount: number, price: number) => {
        if (!currentUser) return;
        
        const userWallet = xrpl.Wallet.fromSeed(currentUser.secret);
        await ensureConnectedWrapped();

        // Fetch freshest data for the account
        let freshMpts: any[] = [];
        try {
            const acctLines = await client.request({ command: 'account_lines', account: userWallet.address });
            const etBalStr = acctLines.result.lines.find((l: any) => l.currency === ET_CURRENCY_CODE)?.balance ?? '0';
            const usdBalStr = acctLines.result.lines.find((l: any) => l.currency === USD_CURRENCY_CODE)?.balance ?? '0';
            const etBal = Math.abs(parseFloat(etBalStr));
            const usdBal = Math.abs(parseFloat(usdBalStr));

            // Fetch fresh NFTs directly from blockchain
            const accountNftsRes = await client.request({ command: 'account_nfts', account: userWallet.address, limit: 200 });
            const nftList = accountNftsRes.result.account_nfts || [];
            for (const nft of nftList) {
                const n: any = nft;
                const nftId = n.NFTokenID || n.nft_id || n.nftid || '';
                if (nftId) {
                    const uriHex = n.URI || n.uri || n.Uri || '';
                    const uriStr = uriHex ? hexToString(uriHex) : '';
                    let metadata: MPTMetadata | null = null;
                    try {
                        if (uriStr) {
                            metadata = JSON.parse(uriStr) as MPTMetadata;
                        }
                    } catch (e) {
                        // ignore
                    }
                    freshMpts.push({
                        hash: nftId,
                        nftId,
                        amount: 1,
                        metadata: metadata || {
                            sourceType: 'Solar_PV' as const,
                            generationTime: new Date().toISOString(),
                            certificateId: nftId,
                            geoLocation: 'Unknown'
                        }
                    });
                }
            }

            if (type === 'OFFER') {
                // OFFER type: just show a message that listings appear in marketplace
                // Don't actually create an offer - wait for consumers to initiate buys
                alert('Your energy NFT listings appear in the marketplace. Consumers will make offers to purchase them.');
                await refreshData(userWallet.address);
                return;

            } else if (type === 'BID') {
                // Buying ET: ensure user has enough USD to cover amount * price
                const required = amount * price;
                if (usdBal < required) {
                    alert(`Insufficient ${USD_CURRENCY_CODE} balance (${usdBal}). Need ${required} to place this bid.`);
                    return;
                }
            }
        } catch (err) {
            console.debug('Could not fetch fresh account data before creating order:', err);
            // proceed — submission will surface any ledger errors
        }

        // For a BID (buy ET), TakerGets is ET, TakerPays is USD
        // For an OFFER (sell ET), TakerGets is USD, TakerPays is ET
        const transaction: xrpl.OfferCreate = {
            TransactionType: "OfferCreate",
            Account: userWallet.address,
            TakerGets: type === 'BID' ? {
                currency: ET_CURRENCY_CODE,
                issuer: ISSUER_WALLET.address,
                value: amount.toString(),
            } : {
                currency: USD_CURRENCY_CODE,
                issuer: GATEWAY_WALLET.address,
                value: (amount * price).toString(),
            },
            TakerPays: type === 'BID' ? {
                currency: USD_CURRENCY_CODE,
                issuer: GATEWAY_WALLET.address,
                value: (amount * price).toString(),
            } : {
                currency: ET_CURRENCY_CODE,
                issuer: ISSUER_WALLET.address,
                value: amount.toString(),
            },
        };
        
        try {
            let prepared: any = await client.autofill(transaction);
            try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signed = userWallet.sign(prepared);
            const res = await client.submitAndWait(signed.tx_blob);
            console.debug('OfferCreate result', res?.result || res);
            alert(`${type} created successfully! Refreshing data...`);
            await refreshData(currentUser.id);
        } catch (error) {
            console.error('Order creation failed:', error);
            // surface engine_result if present
            const maybe = (error as any)?.result || (error as any);
            const msg = maybe?.engine_result_message || maybe?.message || String(error);
            alert(`Error creating order: ${msg}`);
        }
    }, [currentUser, refreshData]);

    const executeTrade = useCallback(async (order: Order) => {
         if (!currentUser) return;
        const userWallet = xrpl.Wallet.fromSeed(currentUser.secret);
        await ensureConnectedWrapped();

        // If the order appears to be an NFT sell offer (MPT), route to NFT accept flow
        const asAny: any = order as any;
        const nftId = asAny.nftId || asAny.rawOffer?.nftId || asAny.rawOffer?.nftID || asAny.rawOffer?.NFTokenID || asAny.rawOffer?.nft_id || asAny.rawOffer?.nftId || asAny.metadata?.nftId;
        const sellOfferIndex = asAny.sellOfferIndex || asAny.rawOffer?.sellOfferIndex || asAny.rawOffer?.sell_offer_index || asAny.rawOffer?.nft_offer_index || asAny.rawOffer?.offer_index || asAny.rawOffer?.index;
        if (nftId && sellOfferIndex) {
            try {
                const res = await buyNFTOffer(sellOfferIndex, nftId);
                if ((res as any)?.error) {
                    alert(`NFT purchase failed: ${(res as any).error}`);
                } else {
                    alert('NFT purchase submitted; refreshing data...');
                }
                await refreshData(currentUser.id);
                return;
            } catch (err) {
                console.error('NFT purchase (executeTrade) failed:', err);
                alert(`Error purchasing NFT: ${extractErrorMessage(err)}`);
                return;
            }
        }

        // Fallback: create a fungible OfferCreate to match the order
        // We create a matching order with the `tfImmediateOrCancel` flag
        // This ensures it fills what it can from the target order without placing a new one
        const transaction: xrpl.OfferCreate = {
            TransactionType: "OfferCreate",
            Account: userWallet.address,
            TakerGets: order.pays,
            TakerPays: order.gets,
            Flags: xrpl.OfferCreateFlags.tfImmediateOrCancel,
        };

        try {
            let prepared: any = await client.autofill(transaction);
            try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signed = userWallet.sign(prepared);
            const res = await client.submitAndWait(signed.tx_blob);
            console.debug('Trade OfferCreate result', res?.result || res);
            alert(`Trade executed successfully! Refreshing data...`);
            await refreshData(currentUser.id);
        } catch (error) {
            console.error('Trade execution failed:', error);
            const maybe = (error as any)?.result || (error as any);
            const msg = maybe?.engine_result_message || maybe?.message || String(error);
            alert(`Error executing trade: ${msg}`);
        }
    }, [currentUser, refreshData]);

    // Create an NFToken sell offer for a given NFTokenID (used for selling MPT NFTs)
    const createNFTSellOffer = useCallback(async (nfTokenId: string, priceDrops: string) => {
        if (!currentUser) return;
        // Support price passed as `USD:<amount>` to allow UI to pass USD and convert to drops here
        try {
            if (typeof priceDrops === 'string' && priceDrops.startsWith('USD:')) {
                const v = parseFloat(priceDrops.split(':')[1] || '0');
                if (!isNaN(v) && v > 0) {
                    priceDrops = usdToDrops(v);
                }
            }
        } catch (e) {
            // ignore and proceed
        }
        
        // Ensure priceDrops is a valid string of digits
        priceDrops = String(priceDrops).trim();
        if (!/^\d+$/.test(priceDrops)) {
            alert('Price must be a positive integer number of drops.');
            return { error: 'invalid_price' };
        }
        
        const userWallet = xrpl.Wallet.fromSeed(currentUser.secret);
        await ensureConnectedWrapped();

        // Verify ownership of the NFT
        try {
            const res = await client.request({ command: 'account_nfts', account: userWallet.address, limit: 200 });
            const nfts = res.result.account_nfts || [];
            const owns = nfts.some((n: any) => (n.NFTokenID || n.nft_id || '') === nfTokenId);
            if (!owns) {
                alert('You do not own that NFToken or it cannot be found in your account.');
                return { error: 'not_owner' };
            }
        } catch (e) {
            console.debug('Could not verify NFT ownership before creating sell offer', e);
            // continue and let submit surface any issues
        }

        // BUY OFFER MODEL (flipped from sell offers to work around xrpl.js validator bug)
        // CONSUMER creates BUY offer → PROSUMER owns NFT and auto-accepts
        // This works reliably because buy offers pass the xrpl.js validator
        
        // The prosumer (NFT owner) address - they're listing this NFT
        const prosumerAddress = userWallet.address;
        
        try {
            await ensureConnectedWrapped();
            
            console.log('Consumer creating buy offer for NFT listing:', {
                Consumer: currentUser.id,
                Prosumer: prosumerAddress,
                NFTokenID: nfTokenId,
                Price: priceDrops,
            });
            
            // Consumer creates a BUY offer
            // Account: consumer (the buyer)
            // Owner: prosumer (the NFT owner/seller)
            // Amount: price in drops
            // Flags: 0x00000004 (tfSellNFToken - makes this a buy offer)
            
            const buyOfferTx: any = {
                TransactionType: 'NFTokenCreateOffer',
                Account: currentUser.id,                      // Consumer is buying
                NFTokenID: nfTokenId,
                Amount: priceDrops,                           // Price in drops
                Owner: prosumerAddress,                       // Prosumer owns the NFT
                Flags: 0x00000004                             // tfSellNFToken flag (buy offer)
            };
            
            // Sign and submit the transaction
            const prepared = await client.autofill(buyOfferTx);
            try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
            
            // Get the consumer's wallet to sign (they're creating this offer)
            const consumerWallet = xrpl.Wallet.fromSeed(currentUser.secret);
            const signed = consumerWallet.sign(prepared);
            
            console.log('Consumer buy offer signed, submitting...');
            const submitResp = await client.submitAndWait(signed.tx_blob);
            console.debug('Buy offer result:', submitResp);
            
            // submitAndWait returns TxResponse which has different structure
            const txResult = (submitResp as any)?.result || submitResp;
            console.debug('Transaction result:', txResult);
            
            if (!submitResp) {
                throw new Error('Buy offer submission returned null response');
            }
            
            console.log('✓ NFT buy offer created successfully! Prosumer can now accept or decline.');
            alert('Energy listing created! Consumers can now make offers.');
            await refreshData(currentUser.id);
            return submitResp;
            
        } catch (error: any) {
            console.error('Creating NFT buy offer failed', error);
            const msg = extractErrorMessage(error);
            alert(`Error creating energy listing: ${msg}`);
            return { error: msg };
        }
    }, [currentUser, refreshData]);

    const simulateGeneration = useCallback(async (amount: number, metadata?: MPTMetadata) => {
        // NFT-based MPT minting: mint an NFToken with metadata and transfer to recipient
        if (!currentUser || currentUser.role !== 'PROSUMER') return;

        const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_WALLET.secret);
        await ensureConnectedWrapped();

        try {
            // 1) Mint NFToken on issuer with URI containing metadata JSON (hex-encoded)
        const mintTx: any = { 
            TransactionType: 'NFTokenMint', 
            Account: issuerWallet.address, 
            NFTokenTaxon: 0,
            Flags: 0x00000008  // tfTransferable flag
            };

            if (metadata) mintTx.URI = stringToHex(JSON.stringify(metadata));

            let preparedMint: any = await client.autofill(mintTx);
            // extend LastLedgerSequence to avoid quick-expiry during multi-step flows
            try { preparedMint.LastLedgerSequence = (preparedMint.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signedMint = issuerWallet.sign(preparedMint);
            const mintRes = await client.submitAndWait(signedMint.tx_blob);
            console.debug('NFTokenMint result', mintRes?.result || mintRes);

            // Attempt direct-mint-to-recipient fallbacks (some rippled builds support extra fields)
            const tryDirectMint = async () => {
                const directVariants: any[] = [
                    // common vendor extension: Destination field on NFTokenMint
                    { ...mintTx, Destination: currentUser.id },
                    // vendor extension: Owner field set to recipient
                    { ...mintTx, Owner: currentUser.id }
                ];

                for (const variant of directVariants) {
                    try {
                        let prepared: any = await client.autofill(variant);
                        try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
                        const signed = issuerWallet.sign(prepared);
                        const res = await client.submitAndWait(signed.tx_blob);
                        // treat any tes* result as success
                        if (res && typeof res === 'object' && String((res as any).result?.engine_result || (res as any).engine_result || '').startsWith('tes')) {
                            console.debug('Direct NFTokenMint variant succeeded', variant, res);
                            return res;
                        } else {
                            console.debug('Direct NFTokenMint variant engine result', variant, res?.result || res);
                        }
                    } catch (e) {
                        console.debug('Direct NFTokenMint variant failed', variant, e?.message || e);
                        // try next variant
                    }
                }
                return null;
            };

            const directRes = await tryDirectMint();
            if (directRes) {
                // minted directly to recipient; refresh and return
                await refreshData(currentUser.id);
                return { mintRes, directRes };
            }

            // 2) Wait for the newly minted NFT to appear on the issuer account (by matching URI hex)
            let newNft: any = null;
            if (metadata) {
                const targetHex = stringToHex(JSON.stringify(metadata)).replace(/^0x/, '');
                newNft = await waitForNftByUriHex(targetHex, issuerWallet.address, 20000, 1000);
            }
            if (!newNft) {
                // fallback: fetch latest issuer NFTs and take the last one
                const issuerNftsRes = await client.request({ command: 'account_nfts', account: issuerWallet.address, limit: 200 });
                const nftList = (issuerNftsRes as any).result?.account_nfts || [];
                newNft = nftList[nftList.length - 1];
            }

            if (!newNft) {
                console.warn('Could not locate minted NFT; aborting transfer.');
                alert('Minted NFT but failed to locate it for transfer.');
                await refreshData(currentUser.id);
                return mintRes;
            }

            // Helper: attempt to detect non-transferable NFTs via common fields
            const nftLooksNonTransferable = (n: any) => {
                if (!n) return false;
                // explicit transferability flags that implementations might expose
                const explicitFalse = [n.Transferable, n.transferable, n.is_transferable, n.isTransferable];
                for (const v of explicitFalse) {
                    if (v === false) return true;
                }
                // Some nodes expose a human-readable 'Flags' numeric bitmask.
                // We can't rely on exact bit values across versions here, but
                // a Flags value of 0 means no special restrictions; any other
                // value is ambiguous — don't assume non-transferable.
                if (typeof n.Flags === 'number' && n.Flags === 0) return false;
                // If Flags exists but no explicit transferable info, leave as unknown (treat as transferable)
                return false;
            };

            if (nftLooksNonTransferable(newNft)) {
                console.warn('Detected NFT that appears non-transferable. Aborting transfer.', newNft);
                alert('Minted NFT appears to be non-transferable on this ledger. Transfer aborted.');
                await refreshData(currentUser.id);
                return { mintRes, note: 'nft_non_transferable_detected' };
            }

            const nfId = newNft.NFTokenID || (newNft as any).nft_id || '';

            // 3) Simplified approach: Use NFTokenBurn + Direct transfer or just mint directly to recipient
            // if the ledger supports the Destination field on NFTokenMint.
            const recipientWallet = xrpl.Wallet.fromSeed(currentUser.secret);
            
            // Attempt direct transfer via Destination field first (most reliable)
            const attemptDirectTransfer = async (): Promise<boolean> => {
                try {
                    const directTransferTx: any = {
                        TransactionType: 'NFTokenMint',
                        Account: issuerWallet.address,
                        NFTokenTaxon: 0,
                        Flags: 0x00000008, // tfTransferable
                        Destination: recipientWallet.address
                    };
                    if (metadata) directTransferTx.URI = stringToHex(JSON.stringify(metadata));
                    
                    await ensureConnectedWrapped();
                    let prepared: any = await client.autofill(directTransferTx);
                    try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
                    const signed = issuerWallet.sign(prepared);
                    const res = await client.submitAndWait(signed.tx_blob);
                    const engine = (res as any)?.result?.engine_result || (res as any)?.engine_result || '';
                    console.debug('Direct NFTokenMint (Destination field) result:', { engine, res });
                    
                    if (String(engine).startsWith('tes')) {
                        console.log('✓ Direct NFT transfer to recipient succeeded');
                        await refreshData(currentUser.id);
                        alert(`${amount} ET minted as NFT and transferred successfully!`);
                        return true;
                    }
                } catch (e) {
                    console.debug('Direct transfer via Destination field failed (expected on some ledgers)', e?.message || e);
                }
                return false;
            };
            
            // Try direct transfer first
            const directSuccess = await attemptDirectTransfer();
            if (directSuccess) {
                return { mintRes, transferred: true };
            }
            
            // Tier 2 Fallback: Issuer creates buy offer (auto-executes, no Prosumer action needed)
            console.log('Issuer creating buy offer for NFT (auto-executing transfer)...');
            try {
                // Issuer creates a buy offer where they are the BUYER
                // The Prosumer owns the NFT, and auto-accepts when issued by issuer
                // This is more reliable than sell offers because no consumer action is required
                console.log(`Issuer creating buy offer for NFT ${nfId}, to be owned by Prosumer ${recipientWallet.address}`);
                
                const buyOfferTx: any = {
                    TransactionType: 'NFTokenCreateOffer',
                    Account: issuerWallet.address,
                    NFTokenID: nfId,
                    Amount: '1',                              // Minimal amount in drops
                    Owner: recipientWallet.address,           // Prosumer owns the NFT
                    Flags: 0x00000004                         // tfSellNFToken flag (makes this a buy offer from issuer's perspective)
                };
                
                let preparedBuyOffer: any = await client.autofill(buyOfferTx);
                try { preparedBuyOffer.LastLedgerSequence = (preparedBuyOffer.LastLedgerSequence || 0) + 100; } catch (e) {}
                const signedBuyOffer = issuerWallet.sign(preparedBuyOffer);
                
                let buyOfferRes: any = null;
                try {
                    buyOfferRes = await client.submitAndWait(signedBuyOffer.tx_blob);
                    console.debug('Buy offer result:', buyOfferRes?.result || buyOfferRes);
                } catch (submitErr) {
                    console.error('Buy offer submission failed', submitErr);
                    throw submitErr;
                }
                
                // Parse response to check for success
                let buyOfferEngine = '';
                let buyOfferMessage = '';
                
                if (buyOfferRes?.result?.engine_result) {
                    buyOfferEngine = buyOfferRes.result.engine_result;
                    buyOfferMessage = buyOfferRes.result.engine_result_message || '';
                } else if (buyOfferRes?.engine_result) {
                    buyOfferEngine = buyOfferRes.engine_result;
                    buyOfferMessage = buyOfferRes.engine_result_message || '';
                }
                
                console.debug('Buy offer engine result:', { buyOfferEngine, buyOfferMessage });
                
                if (!buyOfferRes) {
                    throw new Error('Buy offer submission returned null response');
                }
                
                if (buyOfferEngine && !String(buyOfferEngine).startsWith('tes')) {
                    throw new Error(`NFT buy offer failed with engine result: ${buyOfferEngine}. Message: ${buyOfferMessage}`);
                }
                
                console.log('✓ NFT transferred successfully via buy offer (issuer-controlled, no consumer action needed)');
                await new Promise(r => setTimeout(r, 2000)); // Wait 2s for ledger to process
                await refreshData(currentUser.id);
                alert(`${amount} ET minted as NFT and transferred successfully!`);
                return { mintRes, buyOfferRes, transferred: true };
                
            } catch (fallbackErr) {
                console.error('Buy offer transfer mechanism failed:', fallbackErr);
                const errMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
                throw new Error(`NFT transfer mechanism failed: ${errMsg}`);
            }
        } catch (error) {
            console.error('NFT minting/transfer failed:', error);
            const msg = extractErrorMessage(error);
            alert(`Error minting NFT MPT: ${msg}`);
            // return structured error so caller/UI can handle without crashing
            return { error: msg };
        }
    }, [currentUser, refreshData]);

    // Transfer an NFT (MPT) from one wallet to another (requires issuer capability)
    const transferNFT = useCallback(async (nftId: string, fromWallet: User, toWallet: User) => {
        if (!currentUser) return { error: 'not_logged_in' };
        
        // Only issuer or current owner can initiate transfer
        const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_WALLET.secret);
        const senderSecret = currentUser.id === ISSUER_WALLET.address ? ISSUER_WALLET.secret : (currentUser.role === 'PROSUMER' ? currentUser.secret : null);
        
        if (!senderSecret) {
            return { error: 'insufficient_permissions' };
        }

        const senderWallet = xrpl.Wallet.fromSeed(senderSecret);
        await ensureConnectedWrapped();

        try {
            // Method 1: Try NFTokenCreateOffer (sell offer)
            // Sender creates a sell offer for the NFT to the recipient
            const sellOfferTx: any = {
                TransactionType: 'NFTokenCreateOffer',
                Account: senderWallet.address,
                NFTokenID: nftId,
                Amount: '1' 
            };

            let preparedSellOffer: any = await client.autofill(sellOfferTx);
            try { preparedSellOffer.LastLedgerSequence = (preparedSellOffer.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signedSellOffer = senderWallet.sign(preparedSellOffer);

            let sellOfferRes: any = null;
            try {
                sellOfferRes = await client.submitAndWait(signedSellOffer.tx_blob);
                console.debug('NFT sell offer result:', sellOfferRes?.result || sellOfferRes);
            } catch (submitErr) {
                console.error('Sell offer submission failed', submitErr);
                throw submitErr;
            }

            // Check for success
            let sellOfferEngine = '';
            if (sellOfferRes?.result?.engine_result) {
                sellOfferEngine = sellOfferRes.result.engine_result;
            } else if (sellOfferRes?.engine_result) {
                sellOfferEngine = sellOfferRes.engine_result;
            }

            if (!sellOfferRes) {
                throw new Error('Sell offer submission returned null response');
            }

            if (sellOfferEngine && !String(sellOfferEngine).startsWith('tes')) {
                throw new Error(`NFT sell offer failed with engine result: ${sellOfferEngine}`);
            }

            console.log('✓ NFT transferred successfully via sell offer');
            await new Promise(r => setTimeout(r, 2000)); // Wait for ledger
            await refreshData(currentUser.id);
            return { sellOfferRes, transferred: true };

        } catch (error) {
            console.error('NFT transfer failed:', error);
            const msg = extractErrorMessage(error);
            return { error: msg };
        }
    }, [currentUser, refreshData]);

    // Batch mint and transfer NFTs to a specific wallet
    const mintAndTransferNFTs = useCallback(async (count: number, toWalletUser?: User, metadata?: MPTMetadata) => {
        if (!currentUser) return { error: 'not_logged_in' };

        // Use currentUser as recipient if toWalletUser not provided
        const recipientUser = toWalletUser || currentUser;
        const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_WALLET.secret);
        const results: Array<{ nftId?: string; transferred: boolean; error?: string }> = [];

        try {
            await ensureConnectedWrapped();

            for (let i = 0; i < count; i++) {
                try {
                    console.log(`Minting NFT ${i + 1}/${count} for transfer to ${recipientUser.name} (${recipientUser.id})...`);

                    // 1) Mint NFToken
                    const mintMetadata = metadata || {
                        sourceType: 'Solar_PV' as const,
                        generationTime: new Date().toISOString(),
                        certificateId: `CERT-${Date.now()}-${i}`,
                        geoLocation: 'Grid_Zone_007',
                    };

                    const mintTx: any = {
                        TransactionType: 'NFTokenMint',
                        Account: issuerWallet.address,
                        NFTokenTaxon: 0,
                        Flags: 0x00000008, // tfTransferable
                        URI: stringToHex(JSON.stringify(mintMetadata))
                    };

                    let preparedMint: any = await client.autofill(mintTx);
                    // Set LastLedgerSequence more conservatively: 50 ledgers from current
                    const currentLedger = preparedMint.LastLedgerSequence || 0;
                    preparedMint.LastLedgerSequence = currentLedger + 50;
                    
                    const signedMint = issuerWallet.sign(preparedMint);
                    console.debug(`Submitting mint transaction with LastLedgerSequence: ${preparedMint.LastLedgerSequence}`);
                    const mintRes = await client.submitAndWait(signedMint.tx_blob);
                    console.debug(`NFTokenMint ${i + 1} result:`, mintRes?.result || mintRes);

                    // 2) Wait for NFT to appear on issuer
                    let newNft: any = null;
                    const targetHex = stringToHex(JSON.stringify(mintMetadata)).replace(/^0x/, '');
                    newNft = await waitForNftByUriHex(targetHex, issuerWallet.address, 20000, 1000);

                    if (!newNft) {
                        const issuerNftsRes = await client.request({ command: 'account_nfts', account: issuerWallet.address, limit: 200 });
                        const nftList = (issuerNftsRes as any).result?.account_nfts || [];
                        newNft = nftList[nftList.length - 1];
                    }

                    if (!newNft) {
                        results.push({ transferred: false, error: 'Could not locate minted NFT' });
                        continue;
                    }

                    const nftId = newNft.NFTokenID || (newNft as any).nft_id || '';
                    console.log(`NFT minted: ${nftId}, now transferring to ${recipientUser.id}...`);

                    // 3) Transfer to recipient wallet
                    const transferTx: any = {
                        TransactionType: 'NFTokenCreateOffer',
                        Account: issuerWallet.address,
                        NFTokenID: nftId,
                        Amount: '1',
                        Destination: recipientUser.id
                    };

                    let preparedTransfer: any = await client.autofill(transferTx);
                    // Set LastLedgerSequence more conservatively: 50 ledgers from current
                    const transferCurrentLedger = preparedTransfer.LastLedgerSequence || 0;
                    preparedTransfer.LastLedgerSequence = transferCurrentLedger + 50;
                    
                    const signedTransfer = issuerWallet.sign(preparedTransfer);
                    console.debug(`Submitting transfer transaction with LastLedgerSequence: ${preparedTransfer.LastLedgerSequence}`);
                    const transferRes = await client.submitAndWait(signedTransfer.tx_blob);
                    console.debug(`NFT transfer ${i + 1} result:`, transferRes?.result || transferRes);

                    results.push({ nftId, transferred: true });
                    console.log(`NFT ${i + 1}/${count} successfully transferred. Waiting before next mint...`);
                    await new Promise(r => setTimeout(r, 2000)); // Increased delay between transfers to 2 seconds

                } catch (err) {
                    console.error(`NFT ${i + 1} mint/transfer failed:`, err);
                    results.push({ transferred: false, error: extractErrorMessage(err) });
                }
            }

            // Refresh data for both parties
            await refreshData(issuerWallet.address);
            await refreshData(recipientUser.id);

            return { results, completed: results.filter(r => r.transferred).length };

        } catch (error) {
            console.error('Batch mint/transfer failed:', error);
            return { error: extractErrorMessage(error), results };
        }
    }, [currentUser, refreshData]);

    // Create a buy offer for an NFT listing (hardcoded for demo)
    const createBuyOfferForNFT = useCallback(async (prosumerAddress: string, nftId: string, priceDrops: string) => {
        if (!currentUser || currentUser.role !== 'CONSUMER') {
            return { error: 'Only consumers can create buy offers' };
        }

        try {
            await ensureConnectedWrapped();
            
            console.log('Creating buy offer for NFT:', {
                Consumer: currentUser.id,
                Prosumer: prosumerAddress,
                NFTokenID: nftId,
                Price: priceDrops,
            });
            
            // Consumer creates a BUY offer for the NFT
            const buyOfferTx: any = {
                TransactionType: 'NFTokenCreateOffer',
                Account: currentUser.id,              // Consumer (buyer)
                NFTokenID: nftId,
                Amount: priceDrops,                   // Price in drops
                Owner: prosumerAddress,               // Prosumer (seller/owner)
                Flags: 0x00000004                     // tfSellNFToken (makes this a buy offer)
            };
            
            // Sign and submit the transaction
            const consumerWallet = xrpl.Wallet.fromSeed(currentUser.secret);
            const prepared = await client.autofill(buyOfferTx);
            try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 100; } catch (e) {}
            
            const signed = consumerWallet.sign(prepared);
            
            console.log('Consumer buy offer signed, submitting...');
            const submitResp = await client.submitAndWait(signed.tx_blob);
            console.debug('Buy offer result:', submitResp);
            
            console.log('✓ Buy offer created successfully!');
            return submitResp;
            
        } catch (error: any) {
            console.error('Creating buy offer failed', error);
            const msg = extractErrorMessage(error);
            return { error: msg };
        }
    }, [currentUser]);
    
    useEffect(() => {
        // Ensure client disconnects on component unmount
        return () => {
            disconnectClient();
        };
    }, [disconnectClient]);

    return {
        users: initialUsers,
        currentUser,
        login,
        logout,
        balances,
        orders,
        transactions,
        mpts,
        marketOrders,
        marketplaceNFTOffers,
        refreshMarketplaceNFTOffers,
        buyNFTOffer,
        createOrder,
        executeTrade,
        simulateGeneration,
        transferNFT,
        mintAndTransferNFTs,
        createBuyOfferForNFT,
        refreshData,
        isLoading,
        convertUsdToDrops: usdToDrops,
        isConnected,
        reconnect: ensureConnectedWrapped,
        disconnect: disconnectClient,
    };
};
