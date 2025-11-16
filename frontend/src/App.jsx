import React, {useState} from 'react';
import ConnectWallet from './components/ConnectWallet';
import Quiz from './components/Quiz';
import Collection from './components/Collection';

export default function App(){
    const [address, setAddress] = useState(null);
    return (<div>
        <h1>TCG NFT Game (demo)</h1>
        <ConnectWallet address={address} setAddress={setAddress} />
        {address && <>
            <Quiz address={address} />
            <Collection address={address} />
        </>}
    </div>);
}
