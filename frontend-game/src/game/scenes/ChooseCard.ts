import Card from "../gameobjects/Card";
import WebFont from "webfontloader"

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

        WebFont.load({
            custom: {
                families: [ 'CardTitleFont' ]
            },
        })
    }

    create() {
        // Create game objects
        new Card(this, 0, 0)
    }

}
