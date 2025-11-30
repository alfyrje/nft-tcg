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

    private provider: ethers.BrowserProvider
    private implCardContract?: ethers.Contract
    private implGameContract?: ethers.Contract

    onBattleCreated?: Function

    getPlayerAddress(): string {
        return this.playerAddress
    }
    
    constructor(playerAddress: string, contractAddress: string, abi: ethers.InterfaceAbi, gameLogicAddress: string, gameLogicAbi: ethers.InterfaceAbi) {
        this.contractAddress = contractAddress
        this.playerAddress = playerAddress
        this.abi = abi
        this.gameLogicAddress = gameLogicAddress
        this.gameLogicAbi = gameLogicAbi

        this.provider = new ethers.BrowserProvider(window.ethereum!);
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

        // minimal info for selection
        return new CardInfo({
            id: cardId,
            name: `Card #${cardId}`,
            attack: Number(c.attack),
            health: Number(c.health)
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
                const [id, p1, p2] = e.data;
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

        // Create handlers with resolve callback
        let resolveHandler: (() => void) | null = null;
        let battleStepCount = 0;
        let expectedStepCount = 0;
        let battleFinished = false;

        const battleStepHandler = (handlerBattleId: string, p1CardIndex: string, p2CardIndex: string, p1HealthAfter: string, p2HealthAfter: string, damage: string, attackSide: string) => {
            if (battleId != handlerBattleId) {
                return
            }

            battleStepCount++;
            console.log(`Attacking info delivered cardAIndex=${p1CardIndex}, cardBIndex=${p2CardIndex}, cardAHealth=${p1HealthAfter} cardBHealth=${p2HealthAfter} danage=${damage} attackSide=${attackSide}`)

            playbackInfo.attacks.push({
                cardAIndex: Number(p1CardIndex),
                cardBIndex: Number(p2CardIndex),
                damage: Number(damage),
                cardAHealthAfter: Number(p1HealthAfter),
                cardBHealthAfter: Number(p2HealthAfter),
                attacker: Number(attackSide)
            })

            // Resolve if battle finished and we've received all steps
            if (battleFinished && battleStepCount >= expectedStepCount && resolveHandler) {
                resolveHandler()
            }
        }

        const battleFinishHandler = (handlerBattleId: string, winner: string, loser: string, totalSteps: string) => {
            if (battleId != handlerBattleId) {
                return
            }

            battleFinished = true;
            expectedStepCount = Number(totalSteps);

            if (winner == deckBAddress) {
                playbackInfo.deckWonIndex = 1
            }

            // If we've already received all battle steps, resolve immediately
            if (battleStepCount >= expectedStepCount && resolveHandler) {
                resolveHandler()
            }
        }

        // Register both listeners BEFORE calling resolveBattle
        gameContract.on('BattleResolved', battleFinishHandler)
        gameContract.on('BattleStep', battleStepHandler)

        // Create a Promise that resolves when the handler fires
        const battleFinishPromise = new Promise<void>((resolve) => {
            resolveHandler = resolve
        })

        // Wait for the BattleResolved event and handler to complete
        await battleFinishPromise;

        gameContract.off('BattleResolved', battleFinishHandler)
        gameContract.off('BattleStep', battleStepHandler)

        return playbackInfo
    }
}