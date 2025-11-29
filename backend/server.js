const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));

app.use(express.json());

const PORT = process.env.PORT || 4000;
const OWNER_KEY = process.env.BACKEND_OWNER_PRIVATE_KEY || '';
const CARD_ADDR = process.env.CARD_NFT_ADDRESS || '';
// Use RPC_URL if set, otherwise fall back to local hardhat node
const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';

if(!OWNER_KEY || !CARD_ADDR) {
    console.warn('BACKEND_OWNER_PRIVATE_KEY or CARD_NFT_ADDRESS not set in .env — mint endpoint will fail until set.');
}

const pinnedCards = JSON.parse(fs.readFileSync('./pinned_cards.json', 'utf8'));

const cardAbi = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'CardNFT.sol', 'CardNFT.json')).abi;

const RARITY_WEIGHTS = {
  Common: 60,
  Rare: 25,
  Epic: 10,
  Legendary: 4,
  Mythic: 1
};

const GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/'
];

async function fetchIPFS(ipfsURI) {
    const hash = ipfsURI.replace('ipfs://', '');
    for (const gateway of GATEWAYS) {
        try {
            const url = `${gateway}${hash}`;
            const response = await axios.get(url, { timeout: 5000 });
            return response.data;
        } catch (e) {
            // console.warn(`Gateway ${gateway} failed for ${hash}: ${e.message}`);
            continue;
        }
    }
    throw new Error('All IPFS gateways failed');
}

function pickRandomCardWithRarity() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  let selectedRarity = 'Common';
  
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (rand < cumulative) {
      selectedRarity = rarity;
      break;
    }
  }

  const pool = pinnedCards.filter(c => c.rarity === selectedRarity);
  if (pool.length === 0) {
    // Fallback if no cards of that rarity exist in pinned_cards.json
    return pinnedCards[Math.floor(Math.random() * pinnedCards.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

async function mintCardTo(toAddress, stats) {
  // stats: { attack, health, speed, attribute, rarity, uri }
  const provider = new ethers.JsonRpcProvider(RPC);
  const ownerWallet = new ethers.Wallet(OWNER_KEY, provider);
  const card = new ethers.Contract(CARD_ADDR, cardAbi, ownerWallet);

  // map attribute and rarity strings to enum indexes
  const attrMap = { Fire:0, Water:1, Earth:2, Steel:3, Nature:4 };
  const rarityMap = { Common:0, Rare:1, Epic:2, Legendary:3, Mythic:4 };

  const attrIdx = attrMap[stats.attribute] ?? 0;
  const rarityIdx = rarityMap[stats.rarity] ?? 0;

  // call mintCard(address to, uint16 attack, uint16 health, uint16 speed, Attribute attr, Rarity rarity, string uri)
  const tx = await card.mintCard(toAddress, stats.attack, stats.health, stats.speed, attrIdx, rarityIdx, stats.uri);
  const receipt = await tx.wait();
  return receipt;
}

app.post('/mint', async (req,res) => {
  try {
    const { to, metaURI, attack, health, speed, attribute, rarity } = req.body;
    if(!to || !metaURI) return res.status(400).json({error:'to and metaURI required'});
    const stats = { attack: parseInt(attack), health: parseInt(health), speed: parseInt(speed), attribute, rarity, uri: metaURI };
    const receipt = await mintCardTo(to, stats);
    res.json({ ok:true, receipt });
  } catch(e){
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post("/gacha/pull", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ ok: false, error: "Missing 'to' address" });

    // 1. pick a random pinned card based on rarity weights
    const pick = pickRandomCardWithRarity();

    // 2. build stats object for mintCardTo()
    const stats = {
      attack: pick.attack,
      health: pick.health,
      speed: pick.speed,
      attribute: pick.attr,      
      rarity: pick.rarity,
      uri: pick.metaURI      
    };

    // 3. call your mint function
    const receipt = await mintCardTo(to, stats);

    return res.json({
      ok: true,
      mint: pick,
      txHash: receipt.hash
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/metadata', async (req, res) => {
    try {
        const { uri } = req.query;
        if (!uri) return res.status(400).json({ error: 'Missing uri' });

        const data = await fetchIPFS(uri);
        res.json(data);
    } catch (e) {
        console.error("Metadata fetch failed:", e.message);
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

// minimal in-memory attempts store (reset on restart) - fine for dev
const attempts = {};

app.get('/quiz', async (req,res) => {
    try {
        const r = await axios.get('https://opentdb.com/api.php?amount=3&type=multiple');
        res.json(r.data);
    } catch(e){
        res.status(500).json({error:'failed to fetch quiz'});
    }
});

app.post('/quiz/submit', async (req,res) => {
    // expects: { address, results: [{question, correct_answer, user_answer, token: optional}] }
    const body = req.body;
    if(!body || !body.address || !Array.isArray(body.results)) return res.status(400).json({error:'bad request'});
    // simplistic scoring: count correct answers
    let correct = 0;
    for(const it of body.results) if(it.user_answer && it.correct_answer && it.user_answer === it.correct_answer) correct++;
    // award one pull per correct
    const pulls = correct;
    // reduce attempts (not implemented fully) - for demo accept
    // For each pull generate a card and call mint - here we only simulate
    const pullsResults = [];
    for(let i=0;i<pulls;i++){
        const card = generateCard();
        // TODO: upload metadata to Pinata and call mint on CardNFT via ethers - omitted in minimal demo
        pullsResults.push(card);
    }
    res.json({pulls, results:pullsResults});
});

function randRange(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function pickRarity(){
    const r = Math.random();
    if(r < 0.01) return 'Mythic';
    if(r < 0.05) return 'Legendary';
    if(r < 0.15) return 'Epic';
    if(r < 0.40) return 'Rare';
    return 'Common';
}

const animalNames = ['Fox','Bear','Otter','Tiger','Eagle','Wolf','Panda','Lion','Raven','Boar'];
const attributes = ['Fire','Water','Earth','Steel','Nature'];

function generateCard(){
    const rarity = pickRarity();
    const attr = attributes[Math.floor(Math.random()*attributes.length)];
    let atkRange = [1,4], hpRange=[3,7], spdRange=[1,4];
    if(rarity==='Rare'){ atkRange=[3,6]; hpRange=[5,9]; spdRange=[2,6]; }
    if(rarity==='Epic'){ atkRange=[6,9]; hpRange=[8,12]; spdRange=[4,8]; }
    if(rarity==='Legendary'){ atkRange=[9,13]; hpRange=[12,18]; spdRange=[6,10]; }
    if(rarity==='Mythic'){ atkRange=[12,18]; hpRange=[16,24]; spdRange=[8,14]; }
    const card = {
        name: `${animalNames[Math.floor(Math.random()*animalNames.length)]} ${rarity}`,
        attack: randRange(...atkRange),
        health: randRange(...hpRange),
        speed: randRange(...spdRange),
        attribute: attr,
        rarity
    };
    return card;
}

app.listen(PORT, ()=> console.log('backend listening on', PORT));
