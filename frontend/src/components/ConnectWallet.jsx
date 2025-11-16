import React from 'react';
export default function ConnectWallet({address,setAddress}){
    async function connect(){
        if(!window.ethereum) return alert('Install MetaMask');
        const acc = await window.ethereum.request({method:'eth_requestAccounts'});
        setAddress(acc[0]);
    }
    return (<div>
        {address ? <div>Connected: {address}</div> : <button onClick={connect}>Connect Wallet</button>}
    </div>);
}
