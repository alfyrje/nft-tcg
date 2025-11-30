import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo";
import Button from "./Button";

class BattleResultPrefab extends Phaser.GameObjects.Container {
    static YOU_WIN: string = "You Win!"
    static YOU_LOSE: string = "You Lose!"

    private label: Phaser.GameObjects.Text
    private background: Phaser.GameObjects.Image
    private button: Button

    onReplayRequestedHandler: Function

    constructor(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, playbackResult: BattlePlaybackInfo, addToScene: boolean = true) {
        super(scene)

        this.create(scene, zone, playbackResult)

        if (addToScene) {
            scene.children.add(this)
        }
    }

    private isWinning(playbackResult: BattlePlaybackInfo): boolean {
        return true
    }

    create(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, playbackResult: BattlePlaybackInfo) {
        this.label = scene.add.text(0, 0, BattleResultPrefab.YOU_WIN)

        if (this.isWinning(playbackResult)) {
            this.label.text = BattleResultPrefab.YOU_LOSE
        }

        this.label.setFontSize(35)
        scene.children.remove(this.label)

        this.background = scene.add.image(0, 0, 'generalBackground')
        scene.children.remove(this.background)

        var scaleToZoneX = zone.width / this.background.width
        var scaleToZoneY = zone.height / this.background.height

        this.background.scaleX = scaleToZoneX
        this.background.scaleY = scaleToZoneY

        this.background.setTintFill(0, 0, 0, 0)
        this.background.alpha = 0.8

        this.button = new Button(scene, 0, 0, 'buttonBSheet', 2, 2, {
            text: "Replay",
        }, false)

        this.add(this.background)
        this.add(this.label)
        this.add(this.button)

        this.button.subscribeToEvent(Button.PRESSED_EVENT, () => {
            this.onReplayRequestedHandler()
        })

        Phaser.Display.Align.In.Center(this.label, zone, 0, -zone.height / 10)
        Phaser.Display.Align.In.Center(this.button, zone, 0, zone.height / 10)
        Phaser.Display.Align.In.Center(this.background, zone, 0, 0)
    }
}

export default BattleResultPrefab;