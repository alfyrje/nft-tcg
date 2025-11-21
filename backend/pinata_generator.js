const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const PIN_KEY = process.env.PINATA_API_KEY;
const PIN_SECRET = process.env.PINATA_SECRET_API_KEY;
if(!PIN_KEY || !PIN_SECRET) {
  console.error('set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env');
  process.exit(1);
}

const animals = ['Fox','Bear','Otter','Tiger','Eagle','Wolf','Panda','Lion','Raven','Boar'];
const attributes = ['Fire','Water','Earth','Steel','Nature'];
const rarities = ['Common','Rare','Epic','Legendary','Mythic'];

function svgFor(name, color, id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="100%" height="100%" fill="${color}" />
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="120" fill="#fff">${name}</text>
    <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-size="48" fill="#fff">#${id}</text>
  </svg>`;
}

async function uploadFileToPinata(filename, buffer) {
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  const form = new FormData();
  form.append('file', buffer, { filename });
  const res = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      pinata_api_key: PIN_KEY,
      pinata_secret_api_key: PIN_SECRET
    },
    maxBodyLength: Infinity
  });
  return res.data.IpfsHash; // string
}

async function pinJSON(json) {
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
  const res = await axios.post(url, json, {
    headers: {
      pinata_api_key: PIN_KEY,
      pinata_secret_api_key: PIN_SECRET
    }
  });
  return res.data.IpfsHash;
}

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function pickRarity(){
  const r = Math.random();
  if(r < 0.01) return 'Mythic';
  if(r < 0.05) return 'Legendary';
  if(r < 0.15) return 'Epic';
  if(r < 0.40) return 'Rare';
  return 'Common';
}

function statRangesForRarity(rarity){
  if(rarity==='Common') return {atk:[1,4],hp:[3,7],spd:[1,4]};
  if(rarity==='Rare') return {atk:[3,6],hp:[5,9],spd:[2,6]};
  if(rarity==='Epic') return {atk:[6,9],hp:[8,12],spd:[4,8]};
  if(rarity==='Legendary') return {atk:[9,13],hp:[12,18],spd:[6,10]};
  return {atk:[12,18],hp:[16,24],spd:[8,14]}; // Mythic
}

(async ()=>{
  const count = parseInt(process.argv[2] || "10", 10); // pass number as arg
  const pinned = [];

  for(let i=0;i<count;i++){
    const name = animals[Math.floor(Math.random()*animals.length)];
    const rarity = pickRarity();
    const attr = attributes[Math.floor(Math.random()*attributes.length)];
    const ranges = statRangesForRarity(rarity);
    const attack = randInt(ranges.atk[0], ranges.atk[1]);
    const health = randInt(ranges.hp[0], ranges.hp[1]);
    const speed = randInt(ranges.spd[0], ranges.spd[1]);
    const svg = svgFor(name, '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'), i+1);
    const imgBuf = Buffer.from(svg);

    console.log(`Pinning image for ${name} #${i+1}...`);
    const imageHash = await uploadFileToPinata(`${name}_${i+1}.svg`, imgBuf);
    const imageURI = `ipfs://${imageHash}`;

    const metadata = {
      name: `${name} ${rarity} #${i+1}`,
      description: `${rarity} ${name} card.`,
      image: imageURI,
      attributes: [
        { trait_type: 'Attack', value: attack },
        { trait_type: 'Health', value: health },
        { trait_type: 'Speed', value: speed },
        { trait_type: 'Element', value: attr },
        { trait_type: 'Rarity', value: rarity }
      ]
    };

    console.log(`Pinning metadata for ${name} #${i+1}...`);
    const metaHash = await pinJSON(metadata);
    const metaURI = `ipfs://${metaHash}`;

    pinned.push({
      id: i+1,
      name: metadata.name,
      imageHash,
      imageURI,
      metaHash,
      metaURI,
      attack, health, speed, attr, rarity
    });

    // small delay to be nice
    await new Promise(r=>setTimeout(r, 300));
  }

  fs.writeFileSync('pinned_cards.json', JSON.stringify(pinned, null, 2));
  console.log('Pinned', pinned.length, 'cards. See pinned_cards.json');
})();
