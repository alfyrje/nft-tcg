import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo"
import CardCollection from "./CardCollection"
import ShakePosition from 'phaser3-rex-plugins/plugins/shakeposition.js';
import CardCollectionConfig from "./CardCollectionConfig";
import BattleResultPrefab from "./BattleResultPrefab";
import { CardServerInteractor } from "../scenes/CardServerInteractor";

class CardAttackPrefab extends Phaser.GameObjects.Container {
    private playbackChain: Phaser.Tweens.TweenChain

    onBattleCompleteHandler: Function

    constructor(newScene: Phaser.Scene, zone: Phaser.GameObjects.Zone, playbackInfo: BattlePlaybackInfo, interactor: CardServerInteractor, addToScene: boolean = true) {
        super(newScene)

        this.create(playbackInfo, zone, interactor)

        if (addToScene) {
            this.scene.children.add(this)
        }
    }

    create(playbackInfo: BattlePlaybackInfo, zone: Phaser.GameObjects.Zone, interactor: CardServerInteractor, ) {
        var deckA =  new CardCollection(this.scene, new CardCollectionConfig({
            spacing: 20,
            info: playbackInfo.deckA.cardCollectionInfo,
        }), false)

        var deckB = new CardCollection(this.scene, new CardCollectionConfig({
            spacing: 20,
            info: playbackInfo.deckB.cardCollectionInfo,
        }), false)

        var playerAddr = interactor.getPlayerAddress().toLowerCase()

        if (playbackInfo.deckA.ownerAddress.toLowerCase() == playerAddr) {
            Phaser.Display.Align.In.Center(deckA.container(), zone, 0, zone.width / 3)
            Phaser.Display.Align.In.Center(deckB.container(), zone, 0, -zone.width / 6)
        }
        else {
            Phaser.Display.Align.In.Center(deckA.container(), zone, 0, -zone.width / 6)
            Phaser.Display.Align.In.Center(deckB.container(), zone, 0, zone.width / 3)
        }

        this.queuePlaybackTween(playbackInfo, zone, deckA, deckB)

        this.add(deckA.container())
        this.add(deckB.container())
    }

    startPlayback() {
        this.playbackChain.restart()
    }

    private showDamageText(x: number, y: number, damage: number) {
        // Create floating damage text
        const damageText = this.scene.add.text(x, y, `-${damage}`, {
            fontSize: '32px',
            color: '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        })
        damageText.setOrigin(0.5, 0.5)
        
        // Add to this container so it's part of the prefab
        this.add(damageText)

        // Animate: float up and fade out
        this.scene.tweens.add({
            targets: damageText,
            y: y - 80,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                damageText.destroy()
            }
        })
    }

    queuePlaybackTween(playbackInfo: BattlePlaybackInfo, zone: Phaser.GameObjects.Zone, deckA: CardCollection, deckB: CardCollection) {
        var tweens: Phaser.Types.Tweens.TweenBuilderConfig[]  = []

        for (let i = 0; i < playbackInfo.attacks.length; i++) {
            // Move the card to the middle and attack
            let attackInfo = playbackInfo.attacks[i]

            let deckACurrentCard = deckA.cards()[attackInfo.cardAIndex]
            let deckBCurrentCard = deckB.cards()[attackInfo.cardBIndex]

            let attacking = attackInfo.attacker == 0  ? deckACurrentCard : deckBCurrentCard
            let receiving = attackInfo.attacker == 0 ? deckBCurrentCard : deckACurrentCard

            let receivingHp = attackInfo.attacker == 0 ? attackInfo.cardBHealthAfter : attackInfo.cardAHealthAfter

            console.log(`${receivingHp} ${attackInfo.attacker}`)

            let attackCardWorld = attacking.container().getWorldPoint()
            let receiveCardWorld = receiving.container().getWorldPoint()

            let directionToReceiver = (receiveCardWorld.y - attackCardWorld.y <= 0) ? -1 : 1;
            let distanceRise = 60

            let tweenAttackKaboom: Phaser.Types.Tweens.TweenBuilderConfig = {
                targets: attacking.container(),
                x: receiving.container().x,
                y: (attackCardWorld.y + receiveCardWorld.y) / 2.0 + distanceRise * directionToReceiver - attackCardWorld.y,
                duration: 900,
                ease: "Back.easeInOut"
            }

            tweens.push(tweenAttackKaboom)

            const dippingDistance = 300
            const attackConnectProgress = 0.5

            let isReceivingDead = receivingHp <= 0
            let iCopy = i

            let receivingCopy = receiving.container()
            let receivingCard = receiving
            let shaken: boolean = false

            let receivingContainerCopy = receiving.container()

            //let isKillingHit = isReceivingDead && (i == playbackInfo.attacks.length - 1)

            // Get the damage amount for this attack
            let damageAmount = attackInfo.damage

            tweenAttackKaboom.onUpdate = (tween: Phaser.Tweens.Tween) => {
                if (tween.totalProgress > attackConnectProgress && !shaken) {
                    shaken = true

                    // Show floating damage text
                    this.showDamageText(receivingCopy.getWorldPoint().x, receivingCopy.getWorldPoint().y - 50, damageAmount)

                    // Animate health decrease
                    receivingCard.animateHealthChange(receivingHp, 300)

                    let shake = new ShakePosition(receivingCopy, {
                        duration: 300,
                        magnitude: 20,
                    })

                    shake.shake()

                    if (isReceivingDead) {
                        console.log(`Trying to dip ${iCopy}`)

                        shake.on('complete', () => {
                            var tweenDip : Phaser.Types.Tweens.TweenBuilderConfig = {
                                targets: receivingContainerCopy,
                                x: receivingContainerCopy.x,
                                y: receivingContainerCopy.y + directionToReceiver * dippingDistance,
                                duration: 200,
                                ease: "Sine.easeOut",
                                delay: 300
                            }

                            this.scene.tweens.add(tweenDip)
                        })
                    }
                }
            }

            let tweenRetreat : Phaser.Types.Tweens.TweenBuilderConfig = {
                targets: attacking.container(),
                x: attacking.container().x,
                y: 0,
                duration: 200,
                ease: "Cubic.easeOut"
            }

            tweens.push(tweenRetreat)
        }

        let delayTween: Phaser.Types.Tweens.TweenBuilderConfig = {
            delay: 1000,
            targets: this
        }

        tweens.push(delayTween)

        this.playbackChain = this.scene.tweens.chain({
            targets: null,
            tweens: tweens,
            paused: false
        })

        this.playbackChain.on('complete', () => {
            this.onBattleCompleteHandler()
        })

        this.playbackChain.pause()
    }
}

export default CardAttackPrefab;