import React, {useState} from 'react';
import ConnectWallet from './components/ConnectWallet';
import Quiz from './components/Quiz';
import Collection from './components/Collection';
import Battle from './components/Battle';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

export default function App(){
    const [address, setAddress] = useState(null);
    // Hardcoded for now, but should come from env or config
    // Since we haven't deployed yet in this session, this is a placeholder.
    // The user should update this after deployment.
    // const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
    // const GAMELOGIC_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 

    const CONTRACT_ADDRESS = "0x1805d8713d90173E5C9bb1594226281dcaE28B60"; 
    const GAMELOGIC_ADDRESS = "0x7cE02b300ab583a7Fd8EFBE69BA9f6418B7f9fCf"; 

    return (
        <BrowserRouter>
            <div>
                <h1>TCG NFT Game (demo)</h1>
                <ConnectWallet address={address} setAddress={setAddress} />

                {/* Only show navigation and routes if wallet is connected */}
                {address && (
                    <>
                        {/* Navigation Menu */}
                        <nav>
                            <Link to="/">Home / Quiz</Link> |{" "}
                            <Link to="/battle">Battle</Link> |{" "}
                            <Link to="/collection">Collection</Link>
                        </nav>

                        <hr />

                        {/* Route Definitions */}
                        <Routes>
                            <Route path="/" element={<Quiz address={address} />} />
                            <Route 
                                path="/battle" 
                                element={<Battle address={address} contractAddress={CONTRACT_ADDRESS} gameLogicAddress={GAMELOGIC_ADDRESS} />} 
                            />
                            <Route 
                                path="/collection" 
                                element={<Collection address={address} contractAddress={CONTRACT_ADDRESS} />} 
                            />
                        </Routes>
                    </>
                )}
            </div>
        </BrowserRouter>
    );
}
