// Simple Pinata uploader that generates SVG animal images and uploads image + metadata
// Usage: node pinata_generator.js
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();
const PIN_KEY = process.env.PINATA_API_KEY;
const PIN_SECRET = process.env.PINATA_SECRET_API_KEY;
if(!PIN_KEY || !PIN_SECRET){ console.log('set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env'); process.exit(1); }

const animals = ['Fox','Bear','Otter','Tiger','Eagle','Wolf','Panda','Lion','Raven','Boar'];
function svgFor(name, color){
    return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="${color}" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="48" fill="#fff">${name}</text></svg>`;
}

async function uploadToPinata(filename, dataBuffer){
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', dataBuffer, { filename });
    const res = await axios.post(url, form, { headers: { 
        ...form.getHeaders(), 
        pinata_api_key: PIN_KEY, 
        pinata_secret_api_key: PIN_SECRET
    }});
    return res.data;
}

(async ()=> {
    const name = animals[Math.floor(Math.random()*animals.length)];
    const color = '#'+Math.floor(Math.random()*16777215).toString(16);
    const svg = svgFor(name, color);
    const buf = Buffer.from(svg);
    console.log('Uploading image...');
    try{
        const r = await uploadToPinata(`${name}.svg`, buf);
        console.log('Pinata image response:', r);
        const metadata = {
            name: name,
            description: `A ${name} card.`,
            image: `ipfs://${r.IpfsHash}`,
            attributes: []
        };
        const metaRes = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
            headers: { pinata_api_key: PIN_KEY, pinata_secret_api_key: PIN_SECRET }
        });
        console.log('metadata pinned:', metaRes.data);
    } catch(e){
        console.error('upload error', e?.response?.data || e.message);
    }
})();
