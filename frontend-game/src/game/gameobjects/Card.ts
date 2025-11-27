import CardInfo from "../models/CardInfo";

export default class Card {
    private scene: Phaser.Scene;
    private visualContainer: Phaser.GameObjects.Container
    private eventEmitter: Phaser.Events.EventEmitter;
    private highlightBackground: Phaser.GameObjects.Image

    static HOVER_ENTER_EVENT: string = "hoverEnter" as const;
    static HOVER_EXIT_EVENT: string = "hoverLeave" as const;
    static SELECT_EVENT: string = "selected" as const;

    constructor(scene: Phaser.Scene, cardInfo: CardInfo, addToScene: boolean) {
        this.scene = scene
        this.eventEmitter = new Phaser.Events.EventEmitter()

        this.visualContainer = this.scene.make.container({
            x: 0,
            y: 0
        }, addToScene)

        var background = this.scene.make.image({
            key: 'cardBackground',
            x: 0,
            y: 0,
            add: false
        })

        background.setScale(1.5)

        var cardFrame = this.scene.make.image({
            key: 'cardFrame',
            x: 0,
            y: 0,
            add: false
        })

        cardFrame.setScale(1.5)

        var artFrame = this.scene.make.image({
            key: 'cardArtFrame',
            x: 0,
            y: -30,
            add: false
        })

        artFrame.setScale(1.5)

        var namePlate = this.scene.make.image({
            key: "namePlate",
            x: 0,
            y: 60
        })

        namePlate.setScale(1.5)

        var nameLabel = this.scene.make.text({
            x: 0,
            y: 48
        }, false)

        this.highlightBackground = this.scene.make.image({
            key: 'cardSelectedBackground',
            x: 0,
            y: 0,
            add: false
        })

        this.highlightBackground.setScale(1.5 * 1.1)
        this.highlightBackground.setTint(0xFF8899)

        nameLabel.setFontFamily("CardTitleFont")
        nameLabel.setAlign("center")
        nameLabel.setFontSize(20)
        nameLabel.setColor("#000000")

        nameLabel.setText("Legendary shitty")

        nameLabel.x = -nameLabel.displayWidth / 2

        this.visualContainer.width = background.width * 1.5
        this.visualContainer.height = background.height * 1.5

        this.visualContainer.add(this.highlightBackground)
        this.visualContainer.add(background)
        this.visualContainer.add(namePlate)
        this.visualContainer.add(nameLabel)
        this.visualContainer.add(artFrame)
        //this.container.add(cardFrame)

        this.visualContainer.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, (_1: any, _2: number, _3: number, _4: PointerEvent) => {
            this.eventEmitter.emit(Card.HOVER_ENTER_EVENT, this)
        })

        this.visualContainer.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (_1: any, _2: number, _3: number, _4: PointerEvent) => {
            this.eventEmitter.emit(Card.HOVER_EXIT_EVENT, this)
        })

        this.visualContainer.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (_1: any, _2: number, _3: number, _4: PointerEvent) => {
            this.eventEmitter.emit(Card.SELECT_EVENT, this)
        })

        this.visualContainer.setInteractive()

        this.setHighlighted(false)
    }

    width(): integer {
        return this.visualContainer.width
    }

    height(): integer {
        return this.visualContainer.height
    }

    container(): Phaser.GameObjects.Container {
        return this.visualContainer;
    }

    position(): Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(this.visualContainer.x, this.visualContainer.y)
    }

    setPosition(newPosition: Phaser.Math.Vector2) {
        this.visualContainer.x = newPosition.x;
        this.visualContainer.y = newPosition.y;
    }

    subscribe(eventName: string, fn: Function) {
        this.eventEmitter.addListener(eventName, fn)
    }

    highlighted(): boolean {
        return this.highlightBackground.active
    }

    setHighlighted(active: boolean) {
        this.highlightBackground.active = active
        this.highlightBackground.visible = active
    }
}