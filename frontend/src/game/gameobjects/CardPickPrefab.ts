import CardCollectionInfo from "../models/CardCollectionInfo"
import Button from "./Button";
import CardCollection from "./CardCollection";
import CardCollectionConfig from "./CardCollectionConfig";
import CardPickConfig from "./CardPickConfig";
import CardPickController from "./CardPickController";
import CardInfo from "../models/CardInfo";

class CardPickPrefab extends Phaser.GameObjects.Container {
    private cardCollection: CardCollection;
    private cardPickController: CardPickController
    private queueButton: Button
    private prevButton: Button
    private nextButton: Button
    private pageText: Phaser.GameObjects.Text

    private allCards: CardInfo[]
    private currentPage: number = 0
    private cardsPerPage: number = 0
    private columnsPerRow: number = 0
    private zone: Phaser.GameObjects.Zone
    private scene: Phaser.Scene
    private selectedCardIds: Set<string> = new Set()

    onQueuePressed: Function

    constructor(scene: Phaser.Scene, zone: Phaser.GameObjects.Zone, cardCollectionInfo: CardCollectionInfo, addToScene: boolean = true) {
        super(scene)

        this.scene = scene
        this.zone = zone
        this.allCards = cardCollectionInfo.cardList
        this.currentPage = 0

        var title = scene.add.text(0, 0, 'Select 3 of your cards')
        title.setFontSize(35)

        // Calculate cards per page based on 2 rows
        const cardWidth = 120; // approximate card width
        const spacing = 20;

        this.columnsPerRow = Math.max(1, Math.floor((zone.width * 0.7 + spacing) / (cardWidth + spacing)));
        this.cardsPerPage = this.columnsPerRow * 2; // 2 rows
        
        console.log(`CardPickPrefab: columnsPerRow=${this.columnsPerRow}, cardsPerPage=${this.cardsPerPage}, totalCards=${this.allCards.length}`);

        // Create navigation buttons
        this.prevButton = new Button(scene, 0, 0, 'buttonBSheet', 2, 0.5, {
            text: "<",
        }, false, 2)

        this.nextButton = new Button(scene, 0, 0, 'buttonBSheet', 2, 0.5, {
            text: ">",
        }, false, 2)

        this.pageText = scene.add.text(0, 0, '', { fontSize: '20px', color: '#ffffff' })
        scene.children.remove(this.pageText)

        // Create initial collection with first page
        const initialCards = this.getPageCards(0)
        this.cardCollection = new CardCollection(scene, new CardCollectionConfig({
            spacing: 20,
            info: new CardCollectionInfo(initialCards),
            columns: this.columnsPerRow
        }), false)

        scene.children.remove(title)

        this.cardPickController = new CardPickController(scene, this.cardCollection, new CardPickConfig(), this.selectedCardIds, this.onSelectionChange.bind(this))
        this.queueButton = new Button(scene, 0, 0, 'buttonBSheet', 2, 2, {
            text: "Queue",
        }, false)

        Phaser.Display.Align.In.Center(this.cardCollection.container(), zone, 0, 0)
        Phaser.Display.Align.In.Center(this.queueButton, zone, 0, zone.height / 2 - 60)
        Phaser.Display.Align.In.Center(title, zone, 0, -zone.height / 2.5)
        
        // Position nav buttons on sides
        Phaser.Display.Align.In.LeftCenter(this.prevButton, zone, -20)
        Phaser.Display.Align.In.RightCenter(this.nextButton, zone, -20)
        Phaser.Display.Align.In.Center(this.pageText, zone, 0, this.zone.height / 3)

        this.queueButton.subscribeToEvent(Button.PRESSED_EVENT, this.onQueueButtonPressed.bind(this))
        this.prevButton.subscribeToEvent(Button.PRESSED_EVENT, () => this.changePage(-1))
        this.nextButton.subscribeToEvent(Button.PRESSED_EVENT, () => this.changePage(1))

        this.add(title)
        this.add(this.cardCollection.container())
        this.add(this.queueButton)
        this.add(this.prevButton)
        this.add(this.nextButton)
        this.add(this.pageText)

        this.updatePaginationUI()

        if (addToScene) {
            scene.children.add(this)
        }
    }

    private getPageCards(page: number): CardInfo[] {
        const start = page * this.cardsPerPage
        const end = start + this.cardsPerPage
        return this.allCards.slice(start, end)
    }

    private getTotalPages(): number {
        return Math.ceil(this.allCards.length / this.cardsPerPage)
    }

    private changePage(direction: number) {
        const newPage = this.currentPage + direction
        const totalPages = this.getTotalPages()
        
        if (newPage >= 0 && newPage < totalPages) {
            this.currentPage = newPage
            this.refreshCollection()
            this.updatePaginationUI()
        }
    }

    private onSelectionChange(cardId: string, selected: boolean) {
        if (selected) {
            this.selectedCardIds.add(cardId)
        } else {
            this.selectedCardIds.delete(cardId)
        }
    }

    private refreshCollection() {
        // Remove old collection
        this.cardCollection.container().destroy(true)
        
        // Create new collection with current page cards
        const pageCards = this.getPageCards(this.currentPage)
        
        console.log(`refreshCollection: page=${this.currentPage}, pageCards=${pageCards.length}, columns=${this.columnsPerRow}`);

        this.cardCollection = new CardCollection(this.scene, new CardCollectionConfig({
            spacing: 20,
            info: new CardCollectionInfo(pageCards),
            columns: this.columnsPerRow
        }), false)

        Phaser.Display.Align.In.Center(this.cardCollection.container(), this.zone, 0, 0)
        
        // Update controller with new collection, preserving selected cards
        this.cardPickController = new CardPickController(this.scene, this.cardCollection, new CardPickConfig(), this.selectedCardIds, this.onSelectionChange.bind(this))
        
        this.add(this.cardCollection.container())
    }

    private updatePaginationUI() {
        const totalPages = this.getTotalPages()
        this.prevButton.setDisabled(this.currentPage === 0)
        this.nextButton.setDisabled(this.currentPage >= totalPages - 1)
        this.pageText.setText(`Page ${this.currentPage + 1} / ${totalPages}`)
        
        // Hide pagination if only one page
        const showPagination = totalPages > 1
        this.prevButton.setVisible(showPagination)
        this.nextButton.setVisible(showPagination)
        this.pageText.setVisible(showPagination)

        Phaser.Display.Align.In.Center(this.pageText, this.zone, 0, this.zone.height / 3)
    }

    update() {
        this.queueButton.setDisabled(this.selectedCardIds.size < 3)
    }

    private onQueueButtonPressed() {
        this.onQueuePressed()
    }

    selectedCardsIds(): string[] {
        return Array.from(this.selectedCardIds)
    }
}

export default CardPickPrefab;