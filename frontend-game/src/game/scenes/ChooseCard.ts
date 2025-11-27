import Card from "../gameobjects/Card";
import WebFont from "webfontloader"
import CardCollection from "../gameobjects/CardCollection";
import CardCollectionInfo from "../models/CardCollectionInfo";
import CardInfo from "../models/CardInfo";
import CardRarity from "../models/CardRarity";
import CardElement from "../models/CardElement";
import CardCollectionConfig from "../gameobjects/CardCollectionConfig";
import CardPickController from "../gameobjects/CardPickController";
import CardPickConfig from "../gameobjects/CardPickConfig";

// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class ChooseCard extends Phaser.Scene {
    constructor() {
        super('ChooseCard');
    }

    init() {
        // Initialize scene
        const element = document.createElement('style');
        document.head.appendChild(element);

        const sheet = element.sheet;

        let styles = '@font-face { font-family: "CardTitleFont"; src: url("assets/fonts/GraenMetal.otf") format("opentype"); }\n';

        sheet?.insertRule(styles, 0);
    }

    preload() {
        // Load assets
        this.load.setPath("assets")
        this.load.image('cardBackground', 'cardVisual/CardBackground_RuinWall.png')
        this.load.image('cardFrame', 'cardVisual/CardFrame_Gold.png')
        this.load.image('namePlate', 'cardVisual/NamePlate_ShinyGold.png')
        this.load.image('cardArtFrame', 'cardVisual/CardArtFrame_Gold.png')
        this.load.image('cardSelectedBackground', 'cardVisual/CardBackground_Highlight.png')

        WebFont.load({
            custom: {
                families: [ 'CardTitleFont' ]
            },
        })
    }

    create() {
        // Create game objects
        var cardCollectionInfo = new CardCollectionInfo([
            new CardInfo({
                attack: 50,
                health: 10,
                speed: 20,
                rarity: CardRarity.Common,
                element: CardElement.Earth
            }),
            new CardInfo({
                attack: 70,
                health: 90,
                speed: 25,
                rarity: CardRarity.Epic,
                element: CardElement.Steel
            }),
            new CardInfo({
                attack: 100,
                health: 90,
                speed: 88,
                rarity: CardRarity.Legendary,
                element: CardElement.Steel
            })
        ])

        var cardCollection = new CardCollection(this, new CardCollectionConfig({
            spacing: 20,
            info: cardCollectionInfo,
            x: 600,
            y: 400
        }), true)

        var pickController = new CardPickController(this, cardCollection, new CardPickConfig())
    }

}
