import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo";
import { CardServerInteractor } from "../scenes/CardServerInteractor";
import Button from "./Button";

export interface PendingBattleInfo {
    battleId: string;
    p1: string;
    p2: string;
}

class QueueingPrefab extends Phaser.GameObjects.Container {
    static QUEUEING = "Queueing"
    static LOADING = "Loading"
    static RESUMING = "Resuming..."

    private label: Phaser.GameObjects.Text
    private background: Phaser.GameObjects.Image
    private button: Button
    private cardServerInteractor: CardServerInteractor

    onBattleResolved?: Function

    constructor(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, cardServerInteractor: CardServerInteractor, cards: string[] | null, addToScene: boolean = true, pendingBattle?: PendingBattleInfo) {
        super(scene)

        this.cardServerInteractor = cardServerInteractor;

        this.create(scene, zone, pendingBattle != null)
        
        if (pendingBattle) {
            // Resume mode - we have a pending battle, handle it directly
            this.resumeBattle(pendingBattle)
        } else if (cards) {
            // Normal queue mode
            this.doQueue(cards)
        } else {
            // Waiting mode - just wait for battle event
            this.waitForBattle()
        }

        if (addToScene) {
            scene.children.add(this)
        }
    }

    create(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, isResuming: boolean = false) {
        this.label = scene.add.text(0, 0, isResuming ? QueueingPrefab.RESUMING : QueueingPrefab.QUEUEING)

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

    // Wait for battle without joining queue (player is already waiting)
    waitForBattle() {
        this.cardServerInteractor.onBattleCreated = async (id: string, p1: string, p2: string) => {
            await this.onBattleCreatedHandler(id, p1, p2)
        }
        // Just wait for events - polling will pick them up
    }

    // Resume a pending battle that was found on page load
    async resumeBattle(pendingBattle: PendingBattleInfo) {
        console.log(`Resuming pending battle ${pendingBattle.battleId}`)
        await this.onBattleCreatedHandler(pendingBattle.battleId, pendingBattle.p1, pendingBattle.p2)
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