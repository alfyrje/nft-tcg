import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import CardNFTAbi from '../CardNFT.json';

export default function Collection({address, contractAddress}){
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if(address && contractAddress) loadCollection();
    }, [address, contractAddress]);

    async function loadCollection() {
        if(!window.ethereum) return;
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            const contract = new ethers.Contract(contractAddress, CardNFTAbi.abi, signer);
            
            const tokenIds = await contract.getTokensOfOwner(address);
            const loadedCards = [];
            
            for(let id of tokenIds) {
                const cardData = await contract.getCard(id);
                let meta = {};
                try {
                    // Use backend proxy to avoid CORS and rate limits
                    const metaRes = await fetch(`http://localhost:4000/metadata?uri=${encodeURIComponent(cardData.uri)}`);
                    if (!metaRes.ok) throw new Error('Metadata fetch failed');
                    meta = await metaRes.json();
                } catch(e) {
                    console.error("Failed to load metadata for token", id, e);
                    meta = { name: `Card #${id}`, image: '' };
                }

                console.log(meta)

                loadedCards.push({
                    id: id.toString(),
                    attack: cardData.attack,
                    health: cardData.health,
                    speed: cardData.speed,
                    attr: cardData.attr,
                    rarity: cardData.rarity,
                    name: meta.name,
                    image: meta.image ? meta.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : '',
                    rarityStr: ['Common','Rare','Epic','Legendary','Mythic'][Number(cardData.rarity)],
                    attrStr: ['Fire','Water','Earth','Steel','Nature'][Number(cardData.attr)]
                });
            }
            setCards(loadedCards);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (<div>
        <h2>Your Collection</h2>
        {loading && <p>Loading collection...</p>}
        {!loading && cards.length === 0 && <p>No cards found.</p>}
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            {cards.map(c => (
                <div key={c.id} style={{border:'1px solid #ccc', padding:'10px', borderRadius:'8px', width:'200px'}}>
                    {c.image && <img src={c.image} alt={c.name} style={{width:'100%'}} />}
                    <h3>{c.name}</h3>
                    <p>Rarity: {c.rarityStr}</p>
                    <p>Element: {c.attrStr}</p>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        <span>⚔️ {c.attack.toString()}</span>
                        <span>❤️ {c.health.toString()}</span>
                        <span>⚡ {c.speed.toString()}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>);
}
