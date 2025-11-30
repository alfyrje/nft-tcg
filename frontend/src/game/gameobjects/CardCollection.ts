import Card from "./Card";
import CardCollectionConfig from "./CardCollectionConfig";

class CardCollection {
    private cardList: Card[];
    private origin: Phaser.GameObjects.Container;
    private realContainer: Phaser.GameObjects.Container;
    private config: CardCollectionConfig;

    constructor(scene: Phaser.Scene, config: CardCollectionConfig, addToScene: boolean) {
        this.config = config

        this.cardList = config.info.cardList.map(cardInfo => new Card(scene, cardInfo, false))
        this.realContainer = scene.make.container({}, false)
        this.origin = scene.make.container({}, addToScene)

        this.origin.add(this.realContainer)

        for (let card of this.cardList) {
            this.realContainer.add(card.container())
        }

        this.realignContainer()

        this.origin.x = config.x;
        this.origin.y = config.y
    }

    private realignContainer() {
        if (this.cardList.length === 0) return;

        const singleCardWidth = this.cardList[0].width();
        const singleCardHeight = this.cardList[0].height();
        const spacing = this.config.spacing || 10;

        // If columns is specified, create a grid layout
        if (this.config.columns && this.config.columns > 0) {
            const columns = this.config.columns;
            const rows = Math.ceil(this.cardList.length / columns);

            // Calculate grid dimensions
            const gridWidth = columns * singleCardWidth + (columns - 1) * spacing;
            const gridHeight = rows * singleCardHeight + (rows - 1) * spacing;

            this.realContainer.width = gridWidth;
            this.realContainer.height = gridHeight;
            
            // Center the grid
            this.realContainer.x = -gridWidth / 2;
            this.realContainer.y = -gridHeight / 2;

            // Position each card in the grid
            for (let i = 0; i < this.cardList.length; i++) {
                const col = i % columns;
                const row = Math.floor(i / columns);
                
                const x = col * (singleCardWidth + spacing) + singleCardWidth / 2;
                const y = row * (singleCardHeight + spacing) + singleCardHeight / 2;
                
                this.cardList[i].setPosition(new Phaser.Math.Vector2(x, y));
            }
        } else {
            // Original horizontal layout
            const containerWidth = this.cardList.length * singleCardWidth + spacing * (this.cardList.length - 1);
            const containerHeight = singleCardHeight;

            this.realContainer.width = containerWidth;
            this.realContainer.height = containerHeight;
        
            this.realContainer.x = -containerWidth / 2;
            this.realContainer.y = -containerHeight / 2;

            for (let i = 0; i < this.cardList.length; i++) {
                const x = singleCardWidth * (i + 0.5) + spacing * i;
                this.cardList[i].setPosition(new Phaser.Math.Vector2(x, 0));
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

    container() : Phaser.GameObjects.Container {
        return this.origin
    }

    cards(): Card[] {
        return this.cardList
    }
}

export default CardCollection