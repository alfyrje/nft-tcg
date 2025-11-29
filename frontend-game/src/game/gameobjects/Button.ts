class Button extends Phaser.GameObjects.Container {
    private labelObject: Phaser.GameObjects.Text
    private backgroundObject: Phaser.GameObjects.Sprite
    private hoverBackground: Phaser.GameObjects.Sprite

    constructor(scene: Phaser.Scene, x: number, y: number, backgroundKey: string, spriteNumber: integer, spriteScale: number, textConfig: Phaser.Types.GameObjects.Text.TextConfig, addToScene: boolean = true) {
        super(scene, x, y)

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
        })

        this.hoverBackground.setTintFill(0x696969, 0x696969, 0x696969, 0x696969)
    }

    setText(newText: string) {
        this.labelObject.text = newText;

        this.refreshAlignment();
    }

    private refreshAlignment() {
        Phaser.Display.Align.In.Center(this.labelObject, this.backgroundObject)
    }
}

export default Button;