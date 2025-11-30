import WebFont from "webfontloader"
import CardCollection from "../gameobjects/CardCollection";
import CardCollectionInfo from "../models/CardCollectionInfo";
import CardInfo from "../models/CardInfo";
import CardRarity from "../models/CardRarity";
import CardElement from "../models/CardElement";
import CardCollectionConfig from "../gameobjects/CardCollectionConfig";
import CardPickController from "../gameobjects/CardPickController";
import CardPickConfig from "../gameobjects/CardPickConfig";
import Button from "../gameobjects/Button";
import { initLoadCardAssets, loadCardAssets } from "./Shared";
import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo";
import CardPickPrefab from "../gameobjects/CardPickPrefab";
import CardAttackPrefab from "../gameobjects/CardAttackPrefab";
import BattleResultPrefab from "../gameobjects/BattleResultPrefab";
import { CardServerInteractor } from "./CardServerInteractor";
import QueueingPrefab, { PendingBattleInfo } from "../gameobjects/QueueingPrefab";
import LoadingPrefab from "../gameobjects/LoadingPrefab";


// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class CardMain extends Phaser.Scene {
    private zone: Phaser.GameObjects.Zone
    private cardPicker?: CardPickPrefab
    private cardBattle: CardAttackPrefab
    private battleResult: BattleResultPrefab
    private queueing: QueueingPrefab

    private cardCollectionInfoCache?: CardCollectionInfo
    private cardServerInteractor: CardServerInteractor
    private playbackInfo?: BattlePlaybackInfo
    private loading?: LoadingPrefab

    constructor() {
        super('CardMain');
    }

    init(data: CardServerInteractor) {
        this.cardServerInteractor = data

        // Initialize scene
        initLoadCardAssets()
    }

    preload() {
        // Load assets
        loadCardAssets(this)
    }

    invalidateCardCollectionInfo() {
        this.cardCollectionInfoCache = undefined
    }

    async getCardCollectionInfo(): Promise<CardCollectionInfo> {
        if (this.cardCollectionInfoCache == null) {
            var result = await this.cardServerInteractor.fetchCardCollectionInfo()
            if (result) {
                this.cardCollectionInfoCache = result
            }
            else {
                return this.getCardCollectionInfoTemp()
            }
        }

        return this.cardCollectionInfoCache
    }

    getCardCollectionInfoTemp(): CardCollectionInfo {
        return new CardCollectionInfo([
            new CardInfo({
                attack: 50,
                health: 10,
                speed: 20,
                rarity: CardRarity.Common,
                element: CardElement.Earth,
                name: "Stupid"
            }),
            new CardInfo({
                attack: 70,
                health: 20,
                speed: 25,
                rarity: CardRarity.Epic,
                element: CardElement.Steel,
                name: "Dumb"
            }),
            new CardInfo({
                attack: 100,
                health: 20,
                speed: 88,
                rarity: CardRarity.Legendary,
                element: CardElement.Steel,
                name: "Hi"
            })
        ])
    }

    getBattlePlaybackInfo() : BattlePlaybackInfo {
        return this.playbackInfo!
        /*
        var deckEnemy = new CardCollectionInfo([
            new CardInfo({
                attack: 20,
                health: 10,
                speed: 20,
                rarity: CardRarity.Common,
                element: CardElement.Fire,
                name: "Dragon"
            }),
            new CardInfo({
                attack: 70,
                health: 50,
                speed: 25,
                rarity: CardRarity.Epic,
                element: CardElement.Steel,
                name: "Poo"
            }),
            new CardInfo({
                attack: 100,
                health: 30,
                speed: 88,
                rarity: CardRarity.Common,
                element: CardElement.Steel,
                name: "Real"
            })
        ])
        
        return {
            deckA: { ownerAddress: "0x190", cardCollectionInfo: this.getCardCollectionInfoTemp() },
            deckB: { ownerAddress: "0x34955", cardCollectionInfo: deckEnemy },
            deckWonIndex: 0,
            attacks: [
                {
                    cardAIndex: 0,
                    cardBIndex: 2,
                    cardAHealthAfter: 10,
                    cardBHealthAfter: 15,
                    damage: 15,
                    attacker: 0
                },
                {
                    cardAIndex: 1,
                    cardBIndex: 0,
                    attacker: 1,
                    cardAHealthAfter: 0,
                    cardBHealthAfter: 10,
                    damage: 10,
                }
            ]
        }*/
    }

    createBase() {
        var randomImageIndex = Phaser.Math.Between(1, 4)
        var backgroundImage = this.add.image(0, 0, `bg${randomImageIndex}`)
        backgroundImage.alpha = 0.2

        this.zone = this.add.zone(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)

        var zoneHeightRatio = this.scale.height / backgroundImage.displayHeight
        backgroundImage.setScale(zoneHeightRatio)

        Phaser.Display.Align.In.Center(backgroundImage, this.zone)
    }

    async loadCardPicker() {
        // Show loading screen
        this.loading = new LoadingPrefab(this, this.zone, "Loading Cards")
        
        const cardInfo = await this.getCardCollectionInfo()
        
        // Hide loading screen
        this.loading.destroy()
        this.loading = undefined
        
        this.cardPicker = new CardPickPrefab(this, this.zone, cardInfo)
        this.cardPicker.onQueuePressed = () => {
            this.startQueueing()
        }
    }

    startQueueing() {
        // Disable card interaction while queueing
        this.cardPicker?.setCardsInteractable(false)
        
        this.queueing = new QueueingPrefab(this, this.zone, this.cardServerInteractor, this.cardPicker!.selectedCardsIds(), true)
        this.queueing.onBattleResolved = (playbackData: BattlePlaybackInfo) => {
            this.playbackInfo = playbackData
            this.onBattleReportedFromServer()
        }
    }

    loadBattle() {
        this.cardBattle = new CardAttackPrefab(this, this.zone, this.getBattlePlaybackInfo(), this.cardServerInteractor)
        this.cardBattle.onBattleCompleteHandler = this.onBattlePlaybackCompleted.bind(this)
    }

    onBattleReportedFromServer() {
        this.cameras.main.fadeOut(200, 0, 0, 0)

        let handler = () => {
            this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handler)
            
            this.cardPicker?.destroy()
            this.cardPicker = undefined;
            this.queueing.destroy()

            this.loadBattle()

            this.cameras.main.fadeIn(200, 0, 0, 0)

            let playback = () => {
                this.cardBattle.startPlayback()
                this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, playback)
            }

            this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, playback)
        }

        this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handler)
    }

    onBattlePlaybackCompleted() {
        this.invalidateCardCollectionInfo()

        this.battleResult = new BattleResultPrefab(this, this.zone, this.getBattlePlaybackInfo(), this.cardServerInteractor)
        this.battleResult.onReplayRequestedHandler = this.onReplayRequested.bind(this)
    }

    onReplayRequested() {
        this.cameras.main.fadeOut(200, 0, 0, 0)

        let handleFadeOutFunc = async () => {
            this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handleFadeOutFunc)

            this.battleResult.destroy()
            this.cardBattle.destroy()

            // Show loading screen before fade in
            this.loading = new LoadingPrefab(this, this.zone, "Loading Cards")
            
            // Fade in to show loading screen
            this.cameras.main.fadeIn(200, 0, 0, 0)
            
            // Load cards while loading screen is visible
            const cardInfo = await this.getCardCollectionInfo()
            
            // Hide loading screen and show card picker
            this.loading.destroy()
            this.loading = undefined
            
            this.cardPicker = new CardPickPrefab(this, this.zone, cardInfo)
            this.cardPicker.onQueuePressed = () => {
                this.startQueueing()
            }
        }

        this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handleFadeOutFunc)
    }

    async create() {
        this.createBase()
        
        // Show loading while checking pending state
        this.loading = new LoadingPrefab(this, this.zone, "Loading")
        
        // Check if player has pending queue/battle state
        const pendingState = await this.cardServerInteractor.checkPendingState()
        
        // Hide initial loading
        this.loading.destroy()
        this.loading = undefined
        
        if (pendingState.hasPendingBattle && pendingState.battleId) {
            // Player has an unresolved battle - show queueing screen and resume
            console.log("Found pending battle, resuming...")
            await this.loadCardPicker()
            this.cardPicker?.setCardsInteractable(false)
            
            const pendingBattle: PendingBattleInfo = {
                battleId: pendingState.battleId,
                p1: pendingState.p1!,
                p2: pendingState.p2!
            }
            
            this.queueing = new QueueingPrefab(this, this.zone, this.cardServerInteractor, null, true, pendingBattle)
            this.queueing.onBattleResolved = (playbackData: BattlePlaybackInfo) => {
                this.playbackInfo = playbackData
                this.onBattleReportedFromServer()
            }
        } else if (pendingState.isWaiting) {
            // Player is waiting in queue - show queueing screen
            console.log("Player is waiting in queue, showing queue screen...")
            await this.loadCardPicker()
            this.cardPicker?.setCardsInteractable(false)
            
            this.queueing = new QueueingPrefab(this, this.zone, this.cardServerInteractor, null, true)
            this.queueing.onBattleResolved = (playbackData: BattlePlaybackInfo) => {
                this.playbackInfo = playbackData
                this.onBattleReportedFromServer()
            }
        } else {
            // Normal state - show card picker
            await this.loadCardPicker()
        }
    }

    update(time: number, delta: number): void {
        if (this.cardPicker) {
            this.cardPicker.update()
        }
    }
}
