import { ethers } from "ethers";
import CardCollectionInfo from "../models/CardCollectionInfo";
import CardInfo from "../models/CardInfo";
import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo";

// Retry helper for flaky RPC calls
async function withRetry<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3, 
    delayMs: number = 500,
    label: string = "operation"
): Promise<T> {
    let lastError: any
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (e: any) {
            lastError = e
            const isRpcError = e?.code === -32603 || e?.message?.includes("Internal JSON-RPC")
            if (isRpcError && i < maxRetries - 1) {
                console.warn(`${label} failed (attempt ${i + 1}/${maxRetries}), retrying in ${delayMs}ms...`, e.message)
                await new Promise(r => setTimeout(r, delayMs))
            } else {
                throw e
            }
        }
    }
    throw lastError
}

export class CardServerInteractor {
    private contractAddress: string;
    private abi: ethers.InterfaceAbi
    private playerAddress: string
    private gameLogicAddress: string
    private gameLogicAbi: ethers.InterfaceAbi
    private serverUrl: string

    private provider: ethers.BrowserProvider
    private pollingInterval: ReturnType<typeof setInterval> | null = null
    private lastCheckedBlock: number = 0

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

        console.log("GameLogic address:", gameLogicAddress)

        // Start polling for events instead of relying on WebSocket subscriptions
        this.startEventPolling()
    }

    // Poll for new BattleCreated events every few seconds
    private async startEventPolling() {
        // Get initial block number
        this.lastCheckedBlock = await this.provider.getBlockNumber()
        
        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForBattleCreated()
            } catch (e) {
                console.error("Error polling for events:", e)
            }
        }, 3000) // Poll every 3 seconds
    }

    private async pollForBattleCreated() {
        const gameContract = this.getGameContractBrowser()
        const currentBlock = await this.provider.getBlockNumber()
        
        if (currentBlock <= this.lastCheckedBlock) return
        
        const filter = gameContract.filters.BattleCreated()
        const events = await gameContract.queryFilter(filter, this.lastCheckedBlock + 1, currentBlock)
        
        for (const event of events) {
            if ('args' in event && event.args) {
                const [battleId, p1, p2] = event.args
                console.log("Polled BattleCreated Event:", battleId.toString(), p1, p2)
                this.onBattleCreatedHandler(battleId.toString(), p1, p2)
            }
        }
        
        this.lastCheckedBlock = currentBlock
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
        }
    }

    async getCardContract(): Promise<ethers.Contract> {
        const signer = await this.provider.getSigner();
        return new ethers.Contract(this.contractAddress, this.abi, signer);
    }

    getGameContractBrowser(): ethers.Contract {
        return new ethers.Contract(this.gameLogicAddress, this.gameLogicAbi, this.provider);
    }

    async getGameContractSigner() {
        const signer = await this.provider.getSigner();
        return new ethers.Contract(this.gameLogicAddress, this.gameLogicAbi, signer);
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

        // Load all cards in parallel
        const cardPromises = ids.map((id: any) => this.getCardInfo(id.toString()))
        const loaded = await Promise.all(cardPromises)

        return new CardCollectionInfo(loaded);
    }

    async checkPastEvents() {
        try {
            var gameContract = this.getGameContractBrowser();
            const currentBlock = await this.provider.getBlockNumber();
            // Reduce block range to 100 to avoid RPC limits
            const startBlock = Math.max(0, currentBlock - 100);
            
            const filter = gameContract.filters.BattleCreated();
            const events = await gameContract.queryFilter(filter, startBlock, currentBlock);
            
            console.log(`checkPastEvents: found ${events.length} BattleCreated events from block ${startBlock} to ${currentBlock}`)

            for(const e of events) {
                if (!('args' in e) || !e.args) continue
                
                const [id, p1, p2] = e.args;
                console.log(`Checking event: battleId=${id}, p1=${p1}, p2=${p2}`)
                
                if(p1.toLowerCase() === this.playerAddress.toLowerCase() || p2.toLowerCase() === this.playerAddress.toLowerCase()) {
                    // Check if resolved
                    const resFilter = gameContract.filters.BattleResolved(id);
                    const resEvents = await gameContract.queryFilter(resFilter, startBlock, currentBlock);
                    
                    // If no resolution event found for this battle ID, it's likely still active
                    if(resEvents.length === 0) {
                        console.log(`Battle ${id} is not yet resolved, triggering onBattleCreated`)
                        if (this.onBattleCreated) {
                            this.onBattleCreated(id.toString(), p1, p2)
                        }
                        continue;
                    }
                    console.log(`Battle ${id} already resolved, skipping`)
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
            const gameContract = await this.getGameContractSigner()

            // Approve GameLogic to spend these cards (needed for transfer if lost)
            const isApproved = await cardContract.isApprovedForAll(this.playerAddress, this.gameLogicAddress);
            if (!isApproved) {
                const tx = await cardContract.setApprovalForAll(this.gameLogicAddress, true);
                await tx.wait();
            }

            // Convert string IDs to BigInt for uint256[3]
            const deckBigInt: [bigint, bigint, bigint] = [
                BigInt(selectedCardIds[0]),
                BigInt(selectedCardIds[1]),
                BigInt(selectedCardIds[2])
            ]
            
            console.log("Registering for battle with deck:", deckBigInt)
            const tx = await withRetry(
                () => gameContract.registerForBattle(deckBigInt),
                3,
                500,
                "registerForBattle"
            )
            await tx.wait();
            
            // Check if we are actually the waiting player before setting status
            // This prevents overwriting "Battle Started" if we were the 2nd player
            const wp = await gameContract.waitingPlayer();
            if (wp.toLowerCase() === this.playerAddress.toLowerCase()) {
                console.log('Registered! Waiting for opponent...');
            } else {
                console.log("Transaction success, but not waiting player. Battle likely started.");
                // Optional: Trigger a check for events just in case
                //checkPastEvents(gameContract, provider);
            }

            // We rely on the useEffect listener now.
            return [true, '']
        } catch (e: any) {
            console.error(e);
            return [ false, `Error:  ${(e.reason || e.message)})` ]
        }
    }

    async resolveBattle(battleId: string) {
        const gameContract = await this.getGameContractSigner()
        const gameContractRead = this.getGameContractBrowser()

        // Convert battleId to BigInt for contract calls
        const battleIdBigInt = BigInt(battleId)

        // Wait a bit for block propagation
        await new Promise(r => setTimeout(r, 500));
        
        // Check battle state first
        try {
            const battle = await gameContractRead.battles(battleIdBigInt)
            console.log(`Battle ${battleId} state:`, {
                challenger: battle.challenger,
                opponent: battle.opponent,
                state: Number(battle.state), // 0=Waiting, 1=Ready, 2=Resolved
                challengerReady: battle.challengerReady,
                opponentReady: battle.opponentReady
            })
            
            if (Number(battle.state) === 2) {
                console.log(`Battle ${battleId} is already resolved, skipping resolveBattle call`)
                return
            }
            
            if (Number(battle.state) !== 1) {
                console.warn(`Battle ${battleId} is not in Ready state (state=${battle.state}), cannot resolve`)
                return
            }
        } catch (e) {
            console.error(`Failed to check battle state:`, e)
        }
        
        console.log(`Calling resolveBattle for ${battleId}`)
        
        try {
            // Use BigInt for the contract call with fixed gas limit
            // Skip gas estimation to avoid RPC timeouts on heavy simulation
            // Wrap in retry for flaky RPC
            const tx = await withRetry(
                () => gameContract.resolveBattle(battleIdBigInt, {
                    gasLimit: 3000000n // 3M gas should be enough for most battles
                }),
                3,
                500,
                "resolveBattle"
            )
            console.log(`resolveBattle tx sent: ${tx.hash}, waiting for confirmation...`)
            await tx.wait();
            console.log(`resolveBattle tx confirmed`)
        } catch (e: any) {
            console.error(`resolveBattle failed:`, e)
            
            // Try to extract revert reason
            if (e.reason) {
                console.error(`Revert reason: ${e.reason}`)
            }
            if (e.data) {
                console.error(`Error data: ${e.data}`)
            }
            
            throw e
        }
    }

    async recordPlaybackInfoAsync(battleId: string): Promise<BattlePlaybackInfo> {
        const gameContract = this.getGameContractBrowser()

        // Convert battleId to BigInt for contract calls
        const battleIdBigInt = BigInt(battleId)

        const deckAAddress = await gameContract.getBattleSideAddress(battleIdBigInt, 0)
        const deckBAddress = await gameContract.getBattleSideAddress(battleIdBigInt, 1)

        // Fetch all card IDs in parallel
        const cardIdPromises = []
        for (let i = 0; i < 3; i++) {
            cardIdPromises.push(gameContract.getCardIdOfSide(battleIdBigInt, 0, i))
            cardIdPromises.push(gameContract.getCardIdOfSide(battleIdBigInt, 1, i))
        }
        const cardIds = await Promise.all(cardIdPromises)
        
        // cardIds is [A0, B0, A1, B1, A2, B2]
        const deckACardIds = [cardIds[0], cardIds[2], cardIds[4]]
        const deckBCardIds = [cardIds[1], cardIds[3], cardIds[5]]

        // Fetch all card info in parallel
        const allCardInfoPromises = [
            ...deckACardIds.map(id => this.getCardInfo(id)),
            ...deckBCardIds.map(id => this.getCardInfo(id))
        ]
        const allCardInfo = await Promise.all(allCardInfoPromises)
        
        const deckACards = allCardInfo.slice(0, 3)
        const deckBCards = allCardInfo.slice(3, 6)

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

        // Get current block for limited range queries
        const currentBlock = await this.provider.getBlockNumber()
        // Look back max 500 blocks (adjust based on RPC limits)
        const fromBlock = Math.max(0, currentBlock - 500)

        // Loop until BattleResolved event is found for this battleId
        let battleResolved = false;
        let retryCount = 0;
        const maxRetries = 120; // 30 retries * 2 seconds = 60 seconds max wait
        
        while (!battleResolved && retryCount < maxRetries) {
            try {
                // Query BattleResolved event with block range
                const toBlock = await this.provider.getBlockNumber()
                const resolvedFilter = gameContract.filters.BattleResolved(battleIdBigInt);
                const resolvedEvents = await gameContract.queryFilter(resolvedFilter, fromBlock, toBlock);
                
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
                    retryCount++;
                    // Wait before querying again
                    await new Promise(r => setTimeout(r, 500));
                }
            } catch (e) {
                console.error("Error querying BattleResolved, retrying:", e);
                retryCount++;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (!battleResolved) {
            console.error(`Battle ${battleId} resolution not found after ${maxRetries} retries`);
            // Return partial playback info - the battle may have resolved but we couldn't fetch it
            return playbackInfo;
        }

        // Query BattleStep events with block range
        try {
            const toBlock = await this.provider.getBlockNumber()
            const stepFilter = gameContract.filters.BattleStep(battleIdBigInt);
            const stepEvents = await gameContract.queryFilter(stepFilter, fromBlock, toBlock);
            
            console.log(`Found ${stepEvents.length} battle step events`);
            
            stepEvents.forEach((event) => {
                const args = 'args' in event ? event.args : [];
                const [battleIdEvent, p1CardIndex, p2CardIndex, p1HealthAfter, p2HealthAfter, damage, attackSide] = args;
                
                if (battleIdEvent == battleIdBigInt) {
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
        } catch (e) {
            console.error("Error querying BattleStep events:", e);
        }

        return playbackInfo
    }
}