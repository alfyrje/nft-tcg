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


// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class CardMain extends Phaser.Scene {
    private zone: Phaser.GameObjects.Zone
    private cardPicker: CardPickPrefab
    private cardBattle: CardAttackPrefab
    private battleResult: BattleResultPrefab

    private cardCollectionInfoCache?: CardCollectionInfo
    private cardServerInteractor: CardServerInteractor

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
        }
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
        this.cardPicker = new CardPickPrefab(this, this.zone, await this.getCardCollectionInfo())
        this.cardPicker.onQueuePressed = () => {
            this.cameras.main.fadeOut(200, 0, 0, 0)

            let handler = () => {
                this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handler)
                this.onBattleReportedFromServer()
            }

            this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handler)
        }
    }

    loadBattle() {
        this.cardBattle = new CardAttackPrefab(this, this.zone, this.getBattlePlaybackInfo())
        this.cardBattle.onBattleCompleteHandler = this.onBattlePlaybackCompleted.bind(this)
    }

    onBattleReportedFromServer() {
        this.cardPicker.destroy()
        this.loadBattle()

        this.cameras.main.fadeIn(200, 0, 0, 0)
        this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
            this.cardBattle.startPlayback()
        })
    }

    onBattlePlaybackCompleted() {
        this.battleResult = new BattleResultPrefab(this, this.zone, this.getBattlePlaybackInfo())
        this.battleResult.onReplayRequestedHandler = this.onReplayRequested.bind(this)
    }

    onReplayRequested() {
        this.cameras.main.fadeOut(200, 0, 0, 0)

        let handleFadeOutFunc = async () => {
            this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handleFadeOutFunc)

            this.battleResult.destroy()
            this.cardBattle.destroy()

            await this.loadCardPicker()

            this.cameras.main.fadeIn(200, 0, 0, 0)
        }

        this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handleFadeOutFunc)
    }

    async create() {
        this.createBase()
        await this.loadCardPicker()
    }
}
