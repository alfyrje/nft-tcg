import CardCollectionInfo from "../models/CardCollectionInfo"
import Button from "./Button";
import CardCollection from "./CardCollection";
import CardCollectionConfig from "./CardCollectionConfig";
import CardPickConfig from "./CardPickConfig";
import CardPickController from "./CardPickController";

class CardPickPrefab extends Phaser.GameObjects.Container {
    private cardCollection: CardCollection;
    private cardPickController: CardPickController
    private queueButton: Button

    onQueuePressed: Function

    constructor(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, cardCollectionInfo: CardCollectionInfo, addToScene: boolean = true) {
        super(scene)

        var title = scene.add.text(0, 0, 'Choose your card')
        title.setFontSize(35)

        this.cardCollection = new CardCollection(scene, new CardCollectionConfig({
            spacing: 20,
            info: cardCollectionInfo,
        }), false)

        scene.children.remove(title)

        this.cardPickController = new CardPickController(scene, this.cardCollection, new CardPickConfig())
        this.queueButton = new Button(scene, 0, 0, 'buttonBSheet', 2, 2, {
            text: "Queue",
        }, false)

        Phaser.Display.Align.In.Center(this.cardCollection.container(), zone, 0, zone.width / 30)
        Phaser.Display.Align.In.Center(this.queueButton, zone, 0, zone.width / 10)
        Phaser.Display.Align.In.Center(title, zone, 0, -zone.width / 4)

        this.queueButton.subscribeToEvent(Button.PRESSED_EVENT, this.onQueueButtonPressed.bind(this))

        this.add(title)
        this.add(this.cardCollection.container())
        this.add(this.queueButton)

        if (addToScene) {
            scene.children.add(this)
        }
    }

    private onQueueButtonPressed() {
        this.onQueuePressed()
    }
}

export default CardPickPrefab;