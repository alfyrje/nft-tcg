import React, {useState} from 'react';
import ConnectWallet from './components/ConnectWallet';
import Quiz from './components/Quiz';
import Collection from './components/Collection';
import Battle from './components/Battle';

export default function App(){
    const [address, setAddress] = useState(null);
    // Hardcoded for now, but should come from env or config
    // Since we haven't deployed yet in this session, this is a placeholder.
    // The user should update this after deployment.
    // const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
    // const GAMELOGIC_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 

    const CONTRACT_ADDRESS = "0xEc4b375a6a554B5946D3b25f510453cc8Eed2FF2"; 
    const GAMELOGIC_ADDRESS = "0x51507642439113e65B24B5C450E5934e7c319449"; 

    return (<div>
        <h1>TCG NFT Game (demo)</h1>
        <ConnectWallet address={address} setAddress={setAddress} />
        {address && <>
            <Quiz address={address} />
            <Battle address={address} contractAddress={CONTRACT_ADDRESS} gameLogicAddress={GAMELOGIC_ADDRESS} />
            <Collection address={address} contractAddress={CONTRACT_ADDRESS} />
        </>}
    </div>);
}
