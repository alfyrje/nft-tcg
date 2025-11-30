class LoadingPrefab extends Phaser.GameObjects.Container {
    private label: Phaser.GameObjects.Text
    private background: Phaser.GameObjects.Image
    private dots: number = 0
    private updateTimer?: Phaser.Time.TimerEvent
    private currentMessage: string
    private zone: Phaser.GameObjects.Zone

    constructor(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, message: string = "Loading", addToScene: boolean = true) {
        super(scene)

        this.currentMessage = message
        this.zone = zone

        this.label = scene.add.text(0, 0, message)
        this.label.setFontSize(35)
        this.label.setOrigin(0.5, 0.5) // Center origin for proper alignment
        scene.children.remove(this.label)

        this.background = scene.add.image(0, 0, 'generalBackground')
        scene.children.remove(this.background)

        var scaleToZoneX = zone.width / this.background.width
        var scaleToZoneY = zone.height / this.background.height

        this.background.scaleX = scaleToZoneX
        this.background.scaleY = scaleToZoneY

        this.background.setTintFill(0, 0, 0, 0)
        this.background.alpha = 0.8

        this.add(this.background)
        this.add(this.label)

        Phaser.Display.Align.In.Center(this.label, zone, 0, 0)
        Phaser.Display.Align.In.Center(this.background, zone, 0, 0)

        // Animate dots
        this.updateTimer = scene.time.addEvent({
            delay: 400,
            callback: () => {
                this.dots = (this.dots + 1) % 4
                const dotsStr = '.'.repeat(this.dots)
                this.label.setText(this.currentMessage + dotsStr)
                Phaser.Display.Align.In.Center(this.label, this.zone, 0, 0)
            },
            loop: true
        })

        if (addToScene) {
            scene.children.add(this)
        }
    }

    setMessage(message: string) {
        this.label.setText(message)
    }

    destroy(fromScene?: boolean): void {
        if (this.updateTimer) {
            this.updateTimer.destroy()
            this.updateTimer = undefined
        }
        super.destroy(fromScene)
    }
}

export default LoadingPrefab;
