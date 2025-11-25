// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CardNFT.sol";

contract GameLogic is Ownable {
    CardNFT public card;
    enum BattleState {Waiting, Ready, Resolved}

    struct Temp {uint16 hp; uint16 atk; uint16 spd; CardNFT.Attribute attr;}

    struct Battle {
        address challenger;
        address opponent;
        uint256[3] challengerCards;
        uint256[3] opponentCards;
        bool challengerReady;
        bool opponentReady;
        BattleState state;
    }

    mapping(uint256 => Battle) public battles;
    uint256 public nextBattle;

    address public waitingPlayer;
    uint256[3] public waitingDeck;

    event BattleCreated(uint256 indexed battleId, address indexed p1, address indexed p2);
    event BattleResolved(uint256 indexed battleId, address winner, address loser);

    constructor(address cardAddress) Ownable(msg.sender) { card = CardNFT(cardAddress); }

    function registerForBattle(uint256[3] calldata deck) external {
        for(uint i=0; i<3; i++){
            require(card.ownerOf(deck[i]) == msg.sender, "Not your card");
        }

        if(waitingPlayer == address(0)) {
            waitingPlayer = msg.sender;
            waitingDeck = deck;
        } else {
            require(waitingPlayer != msg.sender, "Already waiting");
            
            uint256 id = nextBattle++;
            Battle storage b = battles[id];
            b.challenger = waitingPlayer;
            b.challengerCards = waitingDeck;
            b.challengerReady = true;
            
            b.opponent = msg.sender;
            b.opponentCards = deck;
            b.opponentReady = true;
            
            b.state = BattleState.Ready;
            
            emit BattleCreated(id, waitingPlayer, msg.sender);
            
            waitingPlayer = address(0);
            delete waitingDeck;
        }
    }

    function createBattle(address opponent) external returns(uint256){
        uint256 id = nextBattle++;
        Battle storage b = battles[id];
        b.challenger = msg.sender;
        b.opponent = opponent;
        b.state = BattleState.Waiting;
        return id;
    }

    function joinBattle(uint256 battleId, uint256[3] calldata selected) external {
        Battle storage b = battles[battleId];
        require(b.state == BattleState.Waiting || b.state == BattleState.Ready);
        require(msg.sender == b.opponent || msg.sender == b.challenger);
        for(uint i=0;i<3;i++){
            require(card.ownerOf(selected[i]) == msg.sender);
        }
        if(msg.sender == b.challenger){
            b.challengerCards = selected;
            b.challengerReady = true;
        } else {
            b.opponentCards = selected;
            b.opponentReady = true;
        }
        if(b.challengerReady && b.opponentReady){
            b.state = BattleState.Ready;
        }
    }

    function resolveBattle(uint256 battleId) external {
        Battle storage b = battles[battleId];
        require(b.state == BattleState.Ready);
        (uint8 winner,) = _simulate(b);
        if(winner==1){
            address loser = b.opponent;
            address winnerAddr = b.challenger;
            _transferRandomFrom(loser, winnerAddr, b.opponentCards);
            emit BattleResolved(battleId, winnerAddr, loser);
        } else {
            address loser = b.challenger;
            address winnerAddr = b.opponent;
            _transferRandomFrom(loser, winnerAddr, b.challengerCards);
            emit BattleResolved(battleId, winnerAddr, loser);
        }
        b.state = BattleState.Resolved;
    }

    function _transferRandomFrom(address from, address to, uint256[3] memory tokens) internal {
        uint r = uint(keccak256(abi.encodePacked(block.timestamp, blockhash(block.number-1), tokens))) % 3;
        uint256 tokenId = tokens[r];
        card.safeTransferFrom(from, to, tokenId);
    }

    function _simulate(Battle storage b) internal view returns(uint8 winner, uint256 wonToken) {
        CardNFT.Card memory c0;
        CardNFT.Card memory c1;
        
        Temp[3] memory A;
        Temp[3] memory B;
        for(uint i=0;i<3;i++){
            c0 = card.getCard(b.challengerCards[i]);
            c1 = card.getCard(b.opponentCards[i]);
            A[i] = Temp({hp:c0.health, atk:c0.attack, spd:c0.speed, attr:c0.attr});
            B[i] = Temp({hp:c1.health, atk:c1.attack, spd:c1.speed, attr:c1.attr});
        }
        uint aliveA = 3; uint aliveB = 3;
        bytes32 seed = keccak256(abi.encodePacked(blockhash(block.number-1), b.challenger, b.opponent, b.challengerCards, b.opponentCards));
        uint turnIndex = 0;
        while(aliveA>0 && aliveB>0 && turnIndex < 1000){
            uint attackerIdx = _nextAttacker(A, B);
            bool attackerIsA = (attackerIdx & 0x80)==0;
            uint idx = uint(attackerIdx & 0x7F);
            if(attackerIsA){
                uint tgt = uint(uint256(keccak256(abi.encodePacked(seed, turnIndex, "A"))) % 3);
                while(B[tgt].hp==0){ tgt = (tgt+1)%3; }
                uint dmg = _computeDamage(A[idx].atk, A[idx].attr, B[tgt].attr);
                if(dmg >= B[tgt].hp) { B[tgt].hp = 0; aliveB--; } else { B[tgt].hp = uint16(uint(B[tgt].hp) - dmg); }
            } else {
                uint tgt = uint(uint256(keccak256(abi.encodePacked(seed, turnIndex, "B"))) % 3);
                while(A[tgt].hp==0){ tgt = (tgt+1)%3; }
                uint dmg = _computeDamage(B[idx].atk, B[idx].attr, A[tgt].attr);
                if(dmg >= A[tgt].hp) { A[tgt].hp = 0; aliveA--; } else { A[tgt].hp = uint16(uint(A[tgt].hp) - dmg); }
            }
            turnIndex++;
            if(turnIndex>0 && turnIndex%50==0){ seed = keccak256(abi.encodePacked(seed, turnIndex)); }
        }
        if(aliveB==0) return (1, b.opponentCards[uint(uint256(seed)%3)]);
        return (2, b.challengerCards[uint(uint256(seed)%3)]);
    }

    function _nextAttacker(Temp[3] memory A, Temp[3] memory B) internal pure returns (uint8) {
        uint highestSpd = 0;
        uint8 idx = 0;
        bool isA = true;
        for(uint i=0;i<3;i++){
            if(A[i].hp>0 && A[i].spd>highestSpd){ highestSpd = A[i].spd; idx = uint8(i); isA = true; }
            if(B[i].hp>0 && B[i].spd>highestSpd){ highestSpd = B[i].spd; idx = uint8(i); isA = false; }
        }
        if(isA) return idx;
        return uint8(0x80 | idx);
    }

    function _computeDamage(uint16 atk, CardNFT.Attribute a, CardNFT.Attribute b) internal pure returns (uint) {
        uint base = atk;
        if((_isCounter(a,b))) return base * 2;
        if((_isWeak(a,b))) return base / 2;
        return base;
    }

    function _isCounter(CardNFT.Attribute a, CardNFT.Attribute b) internal pure returns(bool) {
        if(a==CardNFT.Attribute.Fire && b==CardNFT.Attribute.Steel) return true;
        if(a==CardNFT.Attribute.Water && b==CardNFT.Attribute.Fire) return true;
        if(a==CardNFT.Attribute.Earth && b==CardNFT.Attribute.Water) return true;
        if(a==CardNFT.Attribute.Steel && b==CardNFT.Attribute.Nature) return true;
        if(a==CardNFT.Attribute.Nature && b==CardNFT.Attribute.Earth) return true;
        return false;
    }

    function _isWeak(CardNFT.Attribute a, CardNFT.Attribute b) internal pure returns(bool) {
        if(a==CardNFT.Attribute.Fire && b==CardNFT.Attribute.Water) return true;
        if(a==CardNFT.Attribute.Water && b==CardNFT.Attribute.Earth) return true;
        if(a==CardNFT.Attribute.Earth && b==CardNFT.Attribute.Nature) return true;
        if(a==CardNFT.Attribute.Steel && b==CardNFT.Attribute.Fire) return true;
        if(a==CardNFT.Attribute.Nature && b==CardNFT.Attribute.Steel) return true;
        return false;
    }
}
