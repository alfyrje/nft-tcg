import Card from "./Card";
import CardCollectionConfig from "./CardCollectionConfig";

class CardCollection {
    private cardList: Card[];
    private origin: Phaser.GameObjects.Container;
    private container: Phaser.GameObjects.Container;
    private config: CardCollectionConfig;

    constructor(scene: Phaser.Scene, config: CardCollectionConfig, addToScene: boolean) {
        this.config = config

        this.cardList = config.info.cardList.map(cardInfo => new Card(scene, cardInfo, false))
        this.container = scene.make.container({}, false)
        this.origin = scene.make.container({}, addToScene)

        this.origin.add(this.container)

        for (let card of this.cardList) {
            this.container.add(card.container())
        }

        this.realignContainer()

        this.origin.x = config.x;
        this.origin.y = config.y
    }

    private realignContainer() {
        if (this.cardList.length > 0) {
            let singleCardWidth = this.cardList[0].width()
            let containerWidth = this.cardList.length * singleCardWidth + this.config.spacing * (this.cardList.length - 1)
            let containerHeight = this.cardList[0].height()

            this.container.width = containerWidth
            this.container.height = containerHeight
        
            this.container.x = -containerWidth / 2
            this.container.y = -containerHeight / 2

            for (let i = 0; i < this.cardList.length; i++) {
                let cardRef = this.cardList[i]

                cardRef.setPosition(new Phaser.Math.Vector2(singleCardWidth * (i + 0.5) + this.config.spacing * (i - 1), 0))
            }
        }
    }

    position() : Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(this.origin.x, this.origin.y)
    }

    setPosition(newPosition: Phaser.Math.Vector2) {
        this.origin.x = newPosition.x;
        this.origin.y = newPosition.y;
    }

    cards(): Card[] {
        return this.cardList
    }
}

export default CardCollection