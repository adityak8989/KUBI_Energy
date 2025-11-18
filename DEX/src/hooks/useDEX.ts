import { useState, useCallback, useEffect } from 'react';
import { User, Order, Transaction, Balances } from '../shared/types';
import * as xrpl from 'xrpl';

// --- XRPL Testnet Configuration ---
// WARNING: Do not use these accounts on the mainnet. They are for testing purposes only.
const RIPPLE_TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233';

// Central authority for issuing Energy Tokens (ET)
const ISSUER_WALLET = {
    address: 'rB55t1UnmS53fYLA3y24p8w1P1gMNksTfW',
    secret: 'sEd798BhoTzYPf4d31wgg9sifYyGv8Q',
};

// Simulated financial institution for issuing USD
const GATEWAY_WALLET = {
    address: 'rEqg52Qno8qgJ31CQJ2YfC2E2x2pSAnp1N',
    secret: 'sEdT9Cqf1pUkn2EcN15Fv1EwS3Kz8j6',
};

// --- Currency Codes ---
const ET_CURRENCY_CODE = 'ETK'; // Energy Token
const USD_CURRENCY_CODE = 'USD';

// --- Pre-configured user accounts ---
// In a real app, users would generate their own wallets.
const prosumerUser: User = {
    id: 'rpg2qF53pB2r3qW8xNqR9J4v85S1S1JmR7',
    name: 'Solar Farm Alpha (Prosumer)',
    role: 'PROSUMER',
    kycVerified: true,
    secret: 'sEd7g2R93PS9Lz4M6jK74E1Jt3gDyjG'
};

const consumerUser: User = {
    id: 'rHptm1kAxYffy1gnsjS2d5v4x6doK42f88',
    name: 'Eco Conscious Home (Consumer)',
    role: 'CONSUMER',
    kycVerified: true,
    secret: 'sEdV1wL5sL2FqjK354t7fpmxTDFLgLo'
};

const initialUsers = [prosumerUser, consumerUser];
const client = new xrpl.Client(RIPPLE_TESTNET_SERVER);

export const useDEX = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [balances, setBalances] = useState<Balances>({ et: 0, usd: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [marketOrders, setMarketOrders] = useState<{bids: Order[], offers: Order[]}>({ bids: [], offers: [] });
    const [isLoading, setIsLoading] = useState<boolean>(false);

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
        const userOrders = accountOffers.result.offers.map(xrpl.parseOffer).map(o => ({...o, id: o.id.toString()}))
        setOrders(userOrders);

        // Fetch Transaction History
        const accountTx = await client.request({ command: 'account_tx', account: walletAddress, limit: 20 });
        setTransactions(accountTx.result.transactions.map(tx => tx.tx as any));
        
        // Fetch Market Order Book
        const etGet = { currency: ET_CURRENCY_CODE, issuer: ISSUER_WALLET.address };
        const usdPay = { currency: USD_CURRENCY_CODE, issuer: GATEWAY_WALLET.address };
        
        const bidsResponse = await client.request({ command: 'book_offers', taker_gets: etGet, taker_pays: usdPay });
        const offersResponse = await client.request({ command: 'book_offers', taker_gets: usdPay, taker_pays: etGet });

        setMarketOrders({
            bids: (bidsResponse.result.offers || []).map(xrpl.parseOffer).map(o => ({...o, id: o.id.toString()})),
            offers: (offersResponse.result.offers || []).map(xrpl.parseOffer).map(o => ({...o, id: o.id.toString()}))
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
            const prepared = await client.autofill(transaction);
            const signed = userWallet.sign(prepared);
            await client.submitAndWait(signed.tx_blob);
            alert(`${type} created successfully! Refreshing data...`);
            await refreshData(currentUser.id);
        } catch (error) {
            console.error('Order creation failed:', error);
            alert(`Error creating order: ${error.message}`);
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
            const prepared = await client.autofill(transaction);
            const signed = userWallet.sign(prepared);
            await client.submitAndWait(signed.tx_blob);
            alert(`Trade executed successfully! Refreshing data...`);
            await refreshData(currentUser.id);
        } catch (error) {
            console.error('Trade execution failed:', error);
            alert(`Error executing trade: ${error.message}`);
        }
    }, [currentUser, refreshData]);

    const simulateGeneration = useCallback(async (amount: number) => {
        if (!currentUser || currentUser.role !== 'PROSUMER') return;
        
        const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_WALLET.secret);
        if (!client.isConnected()) await client.connect();

        const transaction: xrpl.Payment = {
            TransactionType: "Payment",
            Account: issuerWallet.address,
            Destination: currentUser.id,
            Amount: {
                currency: ET_CURRENCY_CODE,
                issuer: ISSUER_WALLET.address,
                value: amount.toString(),
            },
        };

        try {
            const prepared = await client.autofill(transaction);
            const signed = issuerWallet.sign(prepared);
            await client.submitAndWait(signed.tx_blob);
            alert(`${amount} ET minted successfully! Refreshing data...`);
            await refreshData(currentUser.id);
        } catch (error) {
            console.error('Minting failed:', error);
            alert(`Error minting tokens: ${error.message}`);
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
        marketOrders,
        createOrder,
        executeTrade,
        simulateGeneration,
        isLoading
    };
};
