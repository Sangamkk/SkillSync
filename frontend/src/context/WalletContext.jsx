import { createContext, useContext, useEffect, useState } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {

    const [walletAddress, setWalletAddress] = useState("");

    const connectWallet = async () => {

        if (!window.ethereum) {
            throw new Error("Please install MetaMask");
        }

        await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [
                {
                    eth_accounts: {}
                }
            ]
        });

        const accounts = await window.ethereum.request({
            method: "eth_accounts"
        });
        console.log(accounts);
        setWalletAddress(accounts[0]);

        return accounts[0];
    };

    useEffect(() => {

        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {

            if (accounts.length === 0) {
                setWalletAddress("");
            } else {
                setWalletAddress(accounts[0]);
            }

        };

        window.ethereum.on(
            "accountsChanged",
            handleAccountsChanged
        );

        return () => {

            window.ethereum.removeListener(
                "accountsChanged",
                handleAccountsChanged
            );

        };

    }, []);

    return (
        <WalletContext.Provider
            value={{
                walletAddress,
                connectWallet,
            }}
        >
            {children}
        </WalletContext.Provider>
    );

};

export const useWallet = () => useContext(WalletContext);