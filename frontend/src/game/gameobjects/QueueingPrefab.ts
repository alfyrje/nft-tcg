import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo";
import { CardServerInteractor } from "../scenes/CardServerInteractor";
import Button from "./Button";

class QueueingPrefab extends Phaser.GameObjects.Container {
    static QUEUEING = "Queueing"
    static LOADING = "Loading"

    private label: Phaser.GameObjects.Text
    private background: Phaser.GameObjects.Image
    private button: Button
    private cardServerInteractor: CardServerInteractor

    onBattleResolved?: Function

    constructor(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, cardServerInteractor: CardServerInteractor, cards: string[], addToScene: boolean = true) {
        super(scene)

        this.cardServerInteractor = cardServerInteractor;

        this.create(scene, zone)
        this.doQueue(cards)

        if (addToScene) {
            scene.children.add(this)
        }
    }

    create(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone) {
        this.label = scene.add.text(0, 0, QueueingPrefab.QUEUEING)

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
            text: "Refresh",
        }, false)

        this.add(this.background)
        this.add(this.label)
        this.add(this.button)

        this.button.subscribeToEvent(Button.PRESSED_EVENT, () => {
            this.cardServerInteractor.checkPastEvents()
        })

        Phaser.Display.Align.In.Center(this.label, zone, 0, -zone.height / 10)
        Phaser.Display.Align.In.Center(this.button, zone, 0, zone.height / 10)
        Phaser.Display.Align.In.Center(this.background, zone, 0, 0)
    }

    async doQueue(cards: string[]) {
        this.cardServerInteractor.onBattleCreated = async (id: string, p1: string, p2: string) => {
            await this.onBattleCreatedHandler(id, p1, p2)
        }

        this.cardServerInteractor.joinQueue(cards)
    }

    async onBattleCreatedHandler(id: string, p1: string, p2: string) {
        this.label.text = QueueingPrefab.LOADING;

        let playbackDataPromise = this.cardServerInteractor.recordPlaybackInfoAsync(id)

        if (this.cardServerInteractor.getPlayerAddress().toLowerCase() == p1.toLowerCase()) {
            await this.cardServerInteractor.resolveBattle(id)
        }

        let playbackData = await playbackDataPromise

        if (this.onBattleResolved) {
            this.onBattleResolved(playbackData)
        }
    }
}

export default QueueingPrefab;