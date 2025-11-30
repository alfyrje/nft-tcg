import { ethers } from "ethers";
import CardCollectionInfo from "../models/CardCollectionInfo";
import CardInfo from "../models/CardInfo";
import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo";

export class CardServerInteractor {
    private contractAddress: string;
    private abi: ethers.InterfaceAbi
    private playerAddress: string
    private gameLogicAddress: string
    private gameLogicAbi: ethers.InterfaceAbi
    private serverUrl: string

    private provider: ethers.BrowserProvider
    private implCardContract?: ethers.Contract
    private implGameContract?: ethers.Contract

    onBattleCreated?: Function

    getPlayerAddress(): string {
        return this.playerAddress
    }
    
    constructor(playerAddress: string, contractAddress: string, abi: ethers.InterfaceAbi, gameLogicAddress: string, gameLogicAbi: ethers.InterfaceAbi, serverUrl: string = 'http://localhost:4000') {
        this.contractAddress = contractAddress
        this.playerAddress = playerAddress
        this.abi = abi
        this.gameLogicAddress = gameLogicAddress
        this.gameLogicAbi = gameLogicAbi
        this.serverUrl = serverUrl

        this.provider = new ethers.BrowserProvider(window.ethereum!);
        this.provider.pollingInterval = 100
    }

    async getCardContract(): Promise<ethers.Contract> {
        if (this.implCardContract == null) {
            const signer = await this.provider.getSigner();
            this.implCardContract = new ethers.Contract(this.contractAddress, this.abi, signer);
        }

        return this.implCardContract
    }

    async getGameContract() {
        if (this.implGameContract == null) {
            const signer = await this.provider.getSigner();
            this.implGameContract = new ethers.Contract(this.gameLogicAddress, this.gameLogicAbi, signer);

            if (this.implGameContract) {
                this.implGameContract.on("BattleCreated", (battleId, p1, p2) => {
                    this.onBattleCreatedHandler(battleId, p1, p2)
                })
            }
        }

        return this.implGameContract
    }

    onBattleCreatedHandler(battleId: string, p1: string, p2: string) {
        console.log("BattleCreated Event:", battleId, p1, p2);
        if (p1.toLowerCase() === this.playerAddress.toLowerCase() || p2.toLowerCase() === this.playerAddress.toLowerCase()) {
            if (this.onBattleCreated) {
                this.onBattleCreated(battleId, p1, p2)
            }
        }
    }

    async getCardInfo(cardId: string) {
        let cardContract = await this.getCardContract()
        const c = await cardContract.getCard(cardId);

        // Try to fetch metadata for the image and name
        let imageUrl: string | undefined = undefined
        let cardName: string = `Card #${cardId}`
        try {
            if (c.uri) {
                const metaRes = await fetch(`${this.serverUrl}/metadata?uri=${encodeURIComponent(c.uri)}`)
                if (metaRes.ok) {
                    const meta = await metaRes.json()
                    imageUrl = meta.image
                    if (meta.name) {
                        cardName = meta.name
                    }
                }
            }
        } catch (e) {
            console.warn(`Failed to fetch metadata for card ${cardId}:`, e)
        }

        return new CardInfo({
            id: cardId,
            name: cardName,
            attack: Number(c.attack),
            health: Number(c.health),
            imageUrl: imageUrl
        })
    }

    async fetchCardCollectionInfo() : Promise<CardCollectionInfo | undefined> {
        let cardContract = await this.getCardContract()
        const ids = await cardContract.getTokensOfOwner(this.playerAddress);

        const loaded: CardInfo[] = [];
        for (let id of ids) {
            // minimal info for selection
            loaded.push(
                await this.getCardInfo(id.toString())
            )
                //{ id: id.toString(), name: `Card #${id}`, attack: c.attack, health: c.health });
        }

        return new CardCollectionInfo(loaded);
    }

    async checkPastEvents() {
        try {
            var gameContract = await this.getGameContract()!;
            const currentBlock = await this.provider.getBlockNumber();
            const startBlock = currentBlock - 1000 > 0 ? currentBlock - 1000 : 0;
            
            const filter = gameContract.filters.BattleCreated(null, null, null);
            const events = await gameContract.queryFilter(filter, startBlock);
            
            for(const e of events) {
                const [id, p1, p2] = e.args;
                if(p1.toLowerCase() === this.playerAddress.toLowerCase() || p2.toLowerCase() === this.playerAddress.toLowerCase()) {
                    // Check if resolved
                    const resFilter = gameContract.filters.BattleResolved(id);
                    const resEvents = await gameContract.queryFilter(resFilter, startBlock);
                    // If no resolution event found for this battle ID, it's likely still active
                    if(resEvents.length === 0) {
                        return;
                    }
                    if (this.onBattleCreated) {
                        this.onBattleCreated(id, p1, p2)
                    }
                }
            }
        } catch(e) {
            console.error("Error checking past events:", e);
        }
    }

    async joinQueue(selectedCardIds: string[]): Promise<[boolean, string]> {
        if (selectedCardIds.length !== 3) return [false, 'Select exactly 3 cards'];
        try {
            const cardContract = await this.getCardContract()
            const gameContract = await this.getGameContract()

            // Approve GameLogic to spend these cards (needed for transfer if lost)
            const isApproved = await cardContract.isApprovedForAll(this.playerAddress, this.gameLogicAddress);
            if (!isApproved) {
                const tx = await cardContract.setApprovalForAll(this.gameLogicAddress, true);
                await tx.wait();
            }

            console.log(selectedCardIds)
            const tx = await gameContract.registerForBattle(selectedCardIds);
            await tx.wait();
            
            // We rely on the useEffect listener now.
            return [true, '']
        } catch (e: any) {
            console.error(e);
            return [ false, `Error:  ${(e.reason || e.message)})` ]
        }
    }

    async resolveBattle(battleId: string) {
        const gameContract = await this.getGameContract()

        // Wait a bit for block propagation
        await new Promise(r => setTimeout(r, 2000));
        
        console.log(`Calling resolveBattle for ${battleId}`)
        const tx = await gameContract.resolveBattle(battleId);
        console.log(`resolveBattle tx sent: ${tx.hash}, waiting for confirmation...`)
        await tx.wait();
        console.log(`resolveBattle tx confirmed`)
    }

    async recordPlaybackInfoAsync(battleId: string): Promise<BattlePlaybackInfo> {
        const gameContract = await this.getGameContract()

        const deckAAddress = await gameContract.getBattleSideAddress(battleId, 0)
        const deckBAddress = await gameContract.getBattleSideAddress(battleId, 1)

        let deckACardIds: string[] = []
        let deckBCardIds: string[] = []
        
        let deckACards: CardInfo[] = []
        let deckBCards: CardInfo[] = []

        for (let i = 0; i < 3; i++) {
            let cardAId = await gameContract.getCardIdOfSide(battleId, 0, i)
            deckACardIds.push(cardAId)

            let cardBId = await gameContract.getCardIdOfSide(battleId, 1, i)
            deckBCardIds.push(cardBId)
        
            let cardA = await this.getCardInfo(cardAId);
            let cardB = await this.getCardInfo(cardBId);

            deckACards.push(cardA)
            deckBCards.push(cardB)
        }

        let playbackInfo = new BattlePlaybackInfo({
            deckA: {
                ownerAddress: deckAAddress,
                cardCollectionInfo: {
                    cardList: deckACards
                },
            },
            deckB: {
                ownerAddress: deckBAddress,
                cardCollectionInfo: {
                    cardList: deckBCards
                }
            },
            attacks: []
        })

        // Loop until BattleResolved event is found for this battleId
        let battleResolved = false;
        while (!battleResolved) {
            // Query BattleResolved event
            const resolvedFilter = gameContract.filters.BattleResolved(battleId);
            const resolvedEvents = await gameContract.queryFilter(resolvedFilter);
            
            if (resolvedEvents.length > 0) {
                const resolvedEvent = resolvedEvents[0];
                const args = 'args' in resolvedEvent ? resolvedEvent.args : [];
                const [battleIdEvent, winner, loser, totalSteps] = args || [];
                
                console.log(`Battle finished: winner=${winner} loser=${loser} totalSteps=${totalSteps}`);
                
                if (winner == deckBAddress) {
                    playbackInfo.deckWonIndex = 1
                } else {
                    playbackInfo.deckWonIndex = 0
                }
                
                battleResolved = true;
            } else {
                // Wait 200ms before querying again
                await new Promise(r => setTimeout(r, 200));
            }
        }

        // Query BattleStep events
        const stepFilter = gameContract.filters.BattleStep(battleId);
        const stepEvents = await gameContract.queryFilter(stepFilter);
        
        console.log(`Found ${stepEvents.length} battle step events`);
        
        stepEvents.forEach((event) => {
            const args = 'args' in event ? event.args : [];
            const [battleIdEvent, p1CardIndex, p2CardIndex, p1HealthAfter, p2HealthAfter, damage, attackSide] = args;
            
            if (battleIdEvent == battleId) {
                console.log(`Attacking info: cardAIndex=${p1CardIndex}, cardBIndex=${p2CardIndex}, cardAHealth=${p1HealthAfter} cardBHealth=${p2HealthAfter} damage=${damage} attackSide=${attackSide}`);
                
                playbackInfo.attacks.push({
                    cardAIndex: Number(p1CardIndex),
                    cardBIndex: Number(p2CardIndex),
                    damage: Number(damage),
                    cardAHealthAfter: Number(p1HealthAfter),
                    cardBHealthAfter: Number(p2HealthAfter),
                    attacker: Number(attackSide)
                });
            }
        });

        return playbackInfo
    }
}