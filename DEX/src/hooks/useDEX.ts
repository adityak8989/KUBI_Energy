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

export const useDEX = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [balances, setBalances] = useState<Balances>({ et: 0, usd: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mpts, setMpts] = useState<Array<{ hash: string; amount: number; metadata: MPTMetadata }>>([]);
    const [marketOrders, setMarketOrders] = useState<{bids: Order[], offers: Order[]}>({ bids: [], offers: [] });
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

    const disconnectClient = useCallback(async () => {
        if (client.isConnected()) {
            await client.disconnect();
        }
    }, []);

    const refreshData = useCallback(async (walletAddress: string) => {
        if (!client.isConnected()) await client.connect();

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
            const detectedNfts: Array<{ hash: string; amount: number; metadata: MPTMetadata }> = [];
            for (const nft of nftList) {
                const n: any = nft;
                const uriHex = n.URI || n.uri || n.Uri || '';
                if (!uriHex) continue;
                const uriStr = hexToString(uriHex);
                try {
                    const parsed = JSON.parse(uriStr) as MPTMetadata;
                    detectedNfts.push({ hash: n.NFTokenID || n.nft_id || n.nftid || '', amount: 0, metadata: parsed });
                } catch (e) {
                    // ignore URIs that are not JSON
                }
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

    const login = useCallback(async (secret: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            const userWallet = xrpl.Wallet.fromSeed(secret);
            const user = initialUsers.find(u => u.id === userWallet.address);

            if (user) {
                await refreshData(user.id);
                setCurrentUser(user);
                setIsLoading(false);
                return true;
            }
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
    }, [disconnectClient]);

    const createOrder = useCallback(async (type: 'BID' | 'OFFER', amount: number, price: number) => {
        if (!currentUser) return;
        
        const userWallet = xrpl.Wallet.fromSeed(currentUser.secret);
        if (!client.isConnected()) await client.connect();

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
            try { prepared.LastLedgerSequence = (prepared.LastLedgerSequence || 0) + 500; } catch (e) {}
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
        if (!client.isConnected()) await client.connect();
        
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

    const simulateGeneration = useCallback(async (amount: number, metadata?: MPTMetadata) => {
        // NFT-based MPT minting: mint an NFToken with metadata and transfer to recipient
        if (!currentUser || currentUser.role !== 'PROSUMER') return;

        const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_WALLET.secret);
        if (!client.isConnected()) await client.connect();

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

            // 2) Wait briefly then locate the newly minted NFT on the issuer account
            await new Promise(r => setTimeout(r, 1000));
            const issuerNftsRes = await client.request({ command: 'account_nfts', account: issuerWallet.address, limit: 200 });
            const nftList = issuerNftsRes.result.account_nfts || [];
            let newNft: any = null;
            if (metadata) {
                const targetHex = stringToHex(JSON.stringify(metadata)).replace(/^0x/, '');
                for (const n of nftList) {
                    const nAny: any = n;
                    const u = (nAny.URI || '').replace(/^0x/, '');
                    if (u && u === targetHex) { newNft = nAny; break; }
                }
            }
            if (!newNft) newNft = nftList[nftList.length - 1];

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

            // 3) Create a BUY offer from the recipient (Account = recipient, Owner = issuer)
            //    Then have the issuer accept that buy offer. This avoids Owner/Account equality errors.
            const recipientWallet = xrpl.Wallet.fromSeed(currentUser.secret);
            // buy offers must have Amount > 0 (drops). Use 1 drop for a free-ish transfer.
            const buyOfferTx: any = {
                TransactionType: 'NFTokenCreateOffer',
                Account: recipientWallet.address,
                Owner: issuerWallet.address,
                NFTokenID: nfId,
                Amount: '1'
            };
            let preparedBuyOffer: any = await client.autofill(buyOfferTx);
            try { preparedBuyOffer.LastLedgerSequence = (preparedBuyOffer.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signedBuyOffer = recipientWallet.sign(preparedBuyOffer);
            const buyOfferRes = await client.submitAndWait(signedBuyOffer.tx_blob);
            console.debug('NFTokenCreateOffer (buy) result', buyOfferRes?.result || buyOfferRes);

            // Wait then locate the buy offer index so the issuer can accept it
            await new Promise(r => setTimeout(r, 1000));
            let buyOfferIndex: string | undefined = undefined;
            try {
                const buyOffersRes = await client.request({ command: 'nft_buy_offers', nft_id: nfId });
                const buyOffers = buyOffersRes.result.offers || [];
                for (const o of buyOffers) {
                    const oAny: any = o;
                    const owner = oAny.owner || oAny.Account || oAny.account;
                    // buy offers will have owner = recipient
                    if (owner === recipientWallet.address) {
                        buyOfferIndex = oAny.nft_offer_index || oAny.index || oAny.offer_index || oAny.nft_offer_id || oAny.offerId || oAny.offer_index;
                        break;
                    }
                }
            } catch (e) {
                // fallback: try nft_sell_offers and search for a matching offer
                try {
                    const sellOffersRes = await client.request({ command: 'nft_sell_offers', nft_id: nfId });
                    const offers = sellOffersRes.result.offers || [];
                    for (const o of offers) {
                        const oAny: any = o;
                        const owner = oAny.owner || oAny.Account || oAny.seller;
                        if (owner === recipientWallet.address) {
                            buyOfferIndex = oAny.nft_offer_index || oAny.index || oAny.offer_index || oAny.nft_offer_id || oAny.offerId;
                            break;
                        }
                    }
                } catch (ee) {
                    // ignore
                }
            }

            if (!buyOfferIndex) {
                console.warn('Could not locate buy offer index to accept. Returning after mint.');
                await refreshData(currentUser.id);
                return { mintRes, buyOfferRes };
            }

            // 4) Issuer accepts the buy offer to transfer NFT
            const acceptTx: any = { TransactionType: 'NFTokenAcceptOffer', Account: issuerWallet.address, NFTokenBuyOffer: buyOfferIndex };
            let preparedAccept: any = await client.autofill(acceptTx);
            try { preparedAccept.LastLedgerSequence = (preparedAccept.LastLedgerSequence || 0) + 100; } catch (e) {}
            const signedAccept = issuerWallet.sign(preparedAccept);
            const acceptRes = await client.submitAndWait(signedAccept.tx_blob);
            console.debug('NFTokenAcceptOffer result', acceptRes?.result || acceptRes);

            alert(`${amount} ET minted as NFT and transferred successfully! Refreshing data...`);
            await refreshData(currentUser.id);
            return { mintRes, buyOfferRes, acceptRes };
        } catch (error) {
            console.error('NFT minting/transfer failed:', error);
            const msg = extractErrorMessage(error);
            alert(`Error minting NFT MPT: ${msg}`);
            // return structured error so caller/UI can handle without crashing
            return { error: msg };
        }
    }, [currentUser, refreshData]);
    
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
        createOrder,
        executeTrade,
        simulateGeneration,
        isLoading
    };
};
