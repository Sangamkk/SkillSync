import { createContext, useContext, useState } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return null;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setWalletAddress(accounts[0]);
    return accounts[0];
  };

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