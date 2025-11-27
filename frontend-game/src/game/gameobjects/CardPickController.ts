import Card from "./Card";
import CardCollection from "./CardCollection";
import CardPickConfig from "./CardPickConfig";

class CardTweenInfo {
    tween: Phaser.Tweens.Tween;
    originalPosition: Phaser.Math.Vector2;
    retreating: boolean;
}

class CardPickController {
    private collection: CardCollection;
    private tweens: Map<Card, CardTweenInfo>;
    private scene: Phaser.Scene;
    private config: CardPickConfig;
    private selectedList: Card[];

    constructor(scene: Phaser.Scene, newCollection: CardCollection, newConfig: CardPickConfig) {
        this.collection = newCollection;
        this.tweens = new Map<Card, CardTweenInfo>();
        this.scene = scene;
        this.config = newConfig;
        this.selectedList = []

        for (let card of newCollection.cards()) {
            card.subscribe(Card.HOVER_ENTER_EVENT, this.onCardHoverEnter.bind(this))
            card.subscribe(Card.HOVER_EXIT_EVENT, this.onCardHoverExit.bind(this))
            card.subscribe(Card.SELECT_EVENT, this.onCardSelected.bind(this))
        }
    }
    
    private onCardHoverEnter(card: Card) {
        let tweenInfo: CardTweenInfo;

        if (this.isCardSelected(card)) {
            return
        }

        if (!this.tweens.has(card)) {
            tweenInfo = new CardTweenInfo();
            tweenInfo.originalPosition = card.position();

            this.tweens.set(card, tweenInfo)
        }
        else {
            tweenInfo = this.tweens.get(card)!;
        }

        tweenInfo.tween?.stop();
        tweenInfo.tween = this.scene.tweens.add({
            targets: card.container(),
            x: tweenInfo.originalPosition.x,
            y: tweenInfo.originalPosition.y - this.config.riseOffset,
            ease: this.config.easeRise,
            duration: this.config.durationRise
        })
    }

    private tryRetreatCard(card: Card) {
        if (this.isCardSelected(card)) {
            return
        }

        if (!this.tweens.has(card)) {
            return;
        }

        let tweenInfo = this.tweens.get(card)
        if (tweenInfo == null) {
            return
        }

        if (tweenInfo.retreating) {
            return;
        }

        tweenInfo.retreating = true
        tweenInfo.tween?.stop();
        tweenInfo.tween = this.scene.tweens.add({
            targets: card.container(),
            x: tweenInfo.originalPosition.x,
            y: tweenInfo.originalPosition.y,
            ease: this.config.easeRetreat,
            duration: this.config.durationRetreat
        }).on(Phaser.Tweens.Events.TWEEN_COMPLETE, () => {
            tweenInfo.retreating = false;
        }).on(Phaser.Tweens.Events.TWEEN_STOP, () => {
            tweenInfo.retreating = false;
        })
    }

    private onCardHoverExit(card: Card) {
        this.tryRetreatCard(card)
    }

    private isCardSelected(card: Card): boolean {
        return this.selectedList.includes(card)
    }

    private onCardSelected(card: Card) {
        var cardIndex = this.selectedList.indexOf(card)
        if (cardIndex >= 0) {
            this.selectedList.splice(cardIndex, 1)
            card.setHighlighted(false)

            this.tryRetreatCard(card)
        } else {
            this.selectedList.push(card)
            card.setHighlighted(true)
        }
    }
}

export default CardPickController