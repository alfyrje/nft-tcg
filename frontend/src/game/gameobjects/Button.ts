class Button extends Phaser.GameObjects.Container {
    private labelObject: Phaser.GameObjects.Text
    private backgroundObject: Phaser.GameObjects.Sprite
    private hoverBackground: Phaser.GameObjects.Sprite
    private eventEmitter: Phaser.Events.EventEmitter
    private disabled: boolean

    static PRESSED_EVENT = "pressed"

    constructor(scene: Phaser.Scene, x: number, y: number, backgroundKey: string, spriteNumber: integer, spriteScale: number, textConfig: Phaser.Types.GameObjects.Text.TextConfig, addToScene: boolean = true) {
        super(scene, x, y)

        this.disabled = false

        this.backgroundObject = this.scene.make.sprite({
            x: x,
            y: y,
            key: backgroundKey,
            frame: spriteNumber
        }, false)

        this.hoverBackground = this.scene.make.sprite({
            x: x,
            y: y,
            key: backgroundKey,
            frame: spriteNumber
        }, false)

        this.labelObject = this.scene.make.text(textConfig, false)
        
        this.add(this.hoverBackground)
        this.add(this.backgroundObject)
        this.add(this.labelObject)

        this.backgroundObject.setScale(spriteScale)
        this.hoverBackground.setScale(spriteScale * 1.1)

        this.width = this.backgroundObject.displayWidth
        this.height = this.backgroundObject.displayHeight

        this.eventEmitter = new Phaser.Events.EventEmitter();

        if (addToScene) {
            scene.children.add(this)
        }

        this.hoverBackground.visible = false

        this.refreshAlignment();
        this.setInteractive()

        this.on(Phaser.Input.Events.POINTER_MOVE, () => {
            this.hoverBackground.visible = true
        })

        this.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.hoverBackground.visible = false
            this.setScale(1)
        })

        this.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.setScale(0.95)
        })

        this.on(Phaser.Input.Events.POINTER_UP, () => {
            this.setScale(1)
            this.eventEmitter.emit(Button.PRESSED_EVENT)
        })

        this.hoverBackground.setTintFill(0x696969, 0x696969, 0x696969, 0x696969)
    }

    setText(newText: string) {
        this.labelObject.text = newText;

        this.refreshAlignment();
    }

    subscribeToEvent(event_key: string, fn: Function) {
        this.eventEmitter.addListener(event_key, fn)
    }

    private refreshAlignment() {
        Phaser.Display.Align.In.Center(this.labelObject, this.backgroundObject)
    }

    updateDisabled() {
        if (this.disabled) {
            this.disableInteractive()
            this.setAlpha(0.4)
        }
        else {
            this.setInteractive()
            this.setAlpha(1)
        }
    }

    setDisabled(disabled: boolean) {
        this.disabled = disabled
        this.updateDisabled()
    }
}

export default Button;