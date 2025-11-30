import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import GameLogicAbi from '../GameLogic.json';
import CardNFTAbi from '../CardNFT.json';
import StartGame from '../game/main';
import { CardServerInteractor } from '../game/scenes/CardServerInteractor';

export default function Battle({ address, contractAddress, gameLogicAddress }) {
    const [myCards, setMyCards] = useState([]);
    const [selected, setSelected] = useState([]);
    const [status, setStatus] = useState('');
    const [battleLog, setBattleLog] = useState([]);
    const currentGame = useRef(null)

    useEffect(() => {
        if (address && contractAddress) loadMyCards();
    }, [address, contractAddress]);

    // Persistent Event Listener
    useEffect(() => {
        if (!gameLogicAddress || !address || !window.ethereum) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const gameContract = new ethers.Contract(gameLogicAddress, GameLogicAbi.abi, provider);

        if (currentGame.current === null)
        {
            var serverInteractor = new CardServerInteractor(address, contractAddress, CardNFTAbi.abi, gameLogicAddress, GameLogicAbi.abi)
            currentGame.current = StartGame("game-container", serverInteractor)
        }
    
        const onBattleCreated = (battleId, p1, p2) => {
            console.log("BattleCreated Event:", battleId, p1, p2);
            if (p1.toLowerCase() === address.toLowerCase() || p2.toLowerCase() === address.toLowerCase()) {
                setStatus(`Battle Started! ID: ${battleId}. Resolving...`);
                resolveBattle(battleId);
            }
        };

        const onBattleResolved = (battleId, winner, loser) => {
            console.log("BattleResolved Event:", battleId, winner, loser);
            if (winner.toLowerCase() === address.toLowerCase()) {
                setStatus('You Won! You stole a card!');
            } else if (loser.toLowerCase() === address.toLowerCase()) {
                setStatus('You Lost! You lost a card.');
            }
        };

        //gameContract.on("BattleCreated", onBattleCreated);
        //gameContract.on("BattleResolved", onBattleResolved);

        // Check for missed events/active battles on mount
        //checkPastEvents(gameContract, provider);

        return () => {
            gameContract.off("BattleCreated", onBattleCreated);
            gameContract.off("BattleResolved", onBattleResolved);

            currentGame.current?.destroy()
            currentGame.current = undefined
        };
    }, [gameLogicAddress, address]);

    async function checkPastEvents(gameContract, provider) {
        try {
            const currentBlock = await provider.getBlockNumber();
            const startBlock = currentBlock - 1000 > 0 ? currentBlock - 1000 : 0;
            
            const filter = gameContract.filters.BattleCreated(null, null, null);
            const events = await gameContract.queryFilter(filter, startBlock);
            
            for(const e of events) {
                const [id, p1, p2] = e.args;
                if(p1.toLowerCase() === address.toLowerCase() || p2.toLowerCase() === address.toLowerCase()) {
                    // Check if resolved
                    const resFilter = gameContract.filters.BattleResolved(id);
                    const resEvents = await gameContract.queryFilter(resFilter, startBlock);
                    // If no resolution event found for this battle ID, it's likely still active
                    if(resEvents.length === 0) {
                        console.log("Found unresolved battle:", id);
                        setStatus(`Found active battle ${id}. Resolving...`);
                        resolveBattle(id);
                        return; // Handle one at a time
                    }
                }
            }
        } catch(e) {
            console.error("Error checking past events:", e);
        }
    }

    async function loadMyCards() {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const cardContract = new ethers.Contract(contractAddress, CardNFTAbi.abi, signer);
        const ids = await cardContract.getTokensOfOwner(address);
        
        const loaded = [];
        for (let id of ids) {
            const c = await cardContract.getCard(id);
            // minimal info for selection
            loaded.push({ id: id.toString(), name: `Card #${id}`, attack: c.attack, health: c.health });
        }
        setMyCards(loaded);
    }

    function toggleSelect(id) {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            if (selected.length < 3) setSelected([...selected, id]);
        }
    }

    async function joinQueue() {
        if (selected.length !== 3) return alert('Select exactly 3 cards');
        setStatus('Approving cards...');
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const cardContract = new ethers.Contract(contractAddress, CardNFTAbi.abi, signer);
            const gameContract = new ethers.Contract(gameLogicAddress, GameLogicAbi.abi, signer);

            // Approve GameLogic to spend these cards (needed for transfer if lost)
            const isApproved = await cardContract.isApprovedForAll(address, gameLogicAddress);
            if (!isApproved) {
                const tx = await cardContract.setApprovalForAll(gameLogicAddress, true);
                await tx.wait();
            }

            setStatus('Joining battle queue...');
            const tx = await gameContract.registerForBattle(selected);
            setStatus('Waiting for transaction...');
            await tx.wait();
            setStatus('Registered! Waiting for opponent...');
            
            // We rely on the useEffect listener now.

        } catch (e) {
            console.error(e);
            setStatus('Error: ' + (e.reason || e.message));
        }
    }

    async function resolveBattle(battleId) {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const gameContract = new ethers.Contract(gameLogicAddress, GameLogicAbi.abi, signer);

            // Wait a bit for block propagation
            await new Promise(r => setTimeout(r, 2000));
            
            const tx = await gameContract.resolveBattle(battleId);
            await tx.wait();
            
            setStatus('Battle Resolved! Checking winner...');
        } catch(e) {
            console.error("Resolve error:", e);
            // It might have been resolved by the other player or failed
            // We can check if it was resolved by querying events again or just wait
            setStatus('Battle processing... (check console)');
        }
    }

    return (
        <div>
            <h2>Battle Arena</h2>
            <p>Select 3 cards to battle. Winner takes a random card from Loser!</p>
            <div style={{display:'flex', gap:'15px', flexWrap:'wrap', marginBottom:'20px', justifyContent: 'center'}}>
                {myCards.map(c => (
                    <div key={c.id} 
                        onClick={() => toggleSelect(c.id)}
                        style={{
                            border: selected.includes(c.id) ? '4px solid #4fc3f7' : '4px solid #e1f5fe',
                            backgroundColor: selected.includes(c.id) ? '#e1f5fe' : '#ffffff',
                            padding: '10px', 
                            borderRadius: '15px', 
                            cursor: 'pointer', 
                            width: '120px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}>
                        <strong>{c.name}</strong><br/>
                        <span style={{fontSize: '1.2em'}}>⚔️{c.attack} ❤️{c.health}</span>
                    </div>
                ))}
            </div>
            <div style={{display:'flex', gap:'15px', justifyContent: 'center'}}>
                <button onClick={joinQueue} disabled={selected.length !== 3 || status.includes('Waiting') || status.includes('Approving')}>
                    {status ? status : 'Find Match'}
                </button>
                <button onClick={() => {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const gameContract = new ethers.Contract(gameLogicAddress, GameLogicAbi.abi, provider);
                    checkPastEvents(gameContract, provider);
                }}>Check Status</button>
            </div>
            <div id="game-container"></div>
        </div>
    );
}