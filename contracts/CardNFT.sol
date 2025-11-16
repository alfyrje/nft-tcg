// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CardNFT is ERC721, Ownable {
    enum Attribute {Fire, Water, Earth, Steel, Nature}
    enum Rarity {Common, Rare, Epic, Legendary, Mythic}
    struct Card {uint16 attack; uint16 health; uint16 speed; Attribute attr; Rarity rarity; string uri;}
    mapping(uint256 => Card) public cards;
    uint256 public nextId;

    constructor() ERC721("TCGCard","TCGC") Ownable(msg.sender) {}

    function mintCard(address to, uint16 attack, uint16 health, uint16 speed, Attribute attr, Rarity rarity, string calldata uri) public onlyOwner {
        uint256 id = nextId++;
        cards[id] = Card(attack,health,speed,attr,rarity,uri);
        _safeMint(to,id);
    }

    function bulkMint(address to, uint16[] calldata attacks, uint16[] calldata healths, uint16[] calldata speeds, Attribute[] calldata attrs, Rarity[] calldata rarities, string[] calldata uris) external onlyOwner {
        require(attacks.length==healths.length && attacks.length==speeds.length && attacks.length==attrs.length && attacks.length==rarities.length && attacks.length==uris.length);
        for(uint i=0;i<attacks.length;i++){
            mintCard(to,attacks[i],healths[i],speeds[i],attrs[i],rarities[i],uris[i]);
        }
    }

    function tokenURI(uint256 tokenId) public view override returns(string memory){
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return cards[tokenId].uri;
    }

    function getCard(uint256 tokenId) external view returns(Card memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return cards[tokenId];
    }
}
