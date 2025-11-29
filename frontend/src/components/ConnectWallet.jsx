import React, { useEffect } from 'react';

export default function ConnectWallet({address, setAddress}){
    
    const AMOY_CHAIN_ID = '0x13882'; // 80002
    const AMOY_PARAMS = {
        chainId: AMOY_CHAIN_ID,
        chainName: 'Polygon Amoy Testnet',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
        },
        rpcUrls: ['https://rpc-amoy.polygon.technology/'],
        blockExplorerUrls: ['https://amoy.polygonscan.com/'],
    };

    async function checkNetwork() {
        if (window.ethereum) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== AMOY_CHAIN_ID) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: AMOY_CHAIN_ID }],
                    });
                } catch (switchError) {
                    // This error code indicates that the chain has not been added to MetaMask.
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [AMOY_PARAMS],
                            });
                        } catch (addError) {
                            console.error(addError);
                        }
                    } else {
                        console.error(switchError);
                    }
                }
            }
        }
    }

    useEffect(() => {
        if(window.ethereum) {
            // Check if already connected
            window.ethereum.request({ method: 'eth_accounts' })
                .then(accounts => {
                    if (accounts.length > 0) {
                        setAddress(accounts[0]);
                        checkNetwork(); // Check network on load if connected
                    }
                });

            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                } else {
                    setAddress(null);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, [setAddress]);

    async function connect(){
        if(!window.ethereum) return alert('Install MetaMask');
        try {
            await checkNetwork(); // Ensure network is correct before connecting
            const acc = await window.ethereum.request({method:'eth_requestAccounts'});
            setAddress(acc[0]);
        } catch (error) {
            console.error(error);
        }
    }

    async function switchWallet() {
        if(!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }]
            });
            const acc = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAddress(acc[0]);
        } catch (error) {
            console.error(error);
        }
    }

    return (<div>
        {address ? (
            <div>
                <span>Connected: {address} </span>
                <button onClick={switchWallet} style={{marginLeft:'10px', fontSize:'0.8em'}}>Switch Wallet</button>
            </div>
        ) : (
            <button onClick={connect}>Connect Wallet</button>
        )}
    </div>);
}
