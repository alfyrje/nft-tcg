import { BattlePlaybackInfo } from "../models/BattlePlaybackInfo"
import CardCollection from "./CardCollection"
import ShakePosition from 'phaser3-rex-plugins/plugins/shakeposition.js';
import CardCollectionConfig from "./CardCollectionConfig";
import BattleResultPrefab from "./BattleResultPrefab";

class CardAttackPrefab extends Phaser.GameObjects.Container {
    private playbackChain: Phaser.Tweens.TweenChain

    onBattleCompleteHandler: Function

    constructor(newScene: Phaser.Scene, zone: Phaser.GameObjects.Zone, playbackInfo: BattlePlaybackInfo, addToScene: boolean = true) {
        super(newScene)

        this.create(playbackInfo, zone)

        if (addToScene) {
            this.scene.children.add(this)
        }
    }

    create(playbackInfo: BattlePlaybackInfo, zone: Phaser.GameObjects.Zone) {
        var deckA =  new CardCollection(this.scene, new CardCollectionConfig({
            spacing: 20,
            info: playbackInfo.deckA.cardCollectionInfo,
        }), false)

        var deckB = new CardCollection(this.scene, new CardCollectionConfig({
            spacing: 20,
            info: playbackInfo.deckB.cardCollectionInfo,
        }), false)

        Phaser.Display.Align.In.Center(deckA.container(), zone, 0, zone.width / 3)
        Phaser.Display.Align.In.Center(deckB.container(), zone, 0, -zone.width / 6)

        this.queuePlaybackTween(playbackInfo, zone, deckA, deckB)

        this.add(deckA.container())
        this.add(deckB.container())
    }

    startPlayback() {
        this.playbackChain.restart()
    }

    queuePlaybackTween(playbackInfo: BattlePlaybackInfo, zone: Phaser.GameObjects.Zone, deckA: CardCollection, deckB: CardCollection) {
        var tweens: Phaser.Types.Tweens.TweenBuilderConfig[]  = []

        for (let i = 0; i < playbackInfo.attacks.length; i++) {
            // Move the card to the middle and attack
            var attackInfo = playbackInfo.attacks[i]
            var deckACurrentCard = deckA.cards()[attackInfo.cardAIndex]
            var deckBCurrentCard = deckB.cards()[attackInfo.cardBIndex]

            var attacking = attackInfo.attacker == 0  ? deckACurrentCard : deckBCurrentCard
            var receiving = attackInfo.attacker == 0 ? deckBCurrentCard : deckACurrentCard

            var receivingHp = attackInfo.attacker == 0 ? attackInfo.cardBHealthAfter : attackInfo.cardAHealthAfter

            var attackCardWorld = attacking.container().getWorldPoint()
            var receiveCardWorld = receiving.container().getWorldPoint()

            var directionToReceiver = (receiveCardWorld.y - attackCardWorld.y <= 0) ? -1 : 1;
            var distanceRise = 60

            var tweenAttackKaboom: Phaser.Types.Tweens.TweenBuilderConfig = {
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

            let receivingCopy = receiving.container()
            let shaken: boolean = false

            //let isKillingHit = isReceivingDead && (i == playbackInfo.attacks.length - 1)

            tweenAttackKaboom.onUpdate = (tween: Phaser.Tweens.Tween) => {
                if (tween.totalProgress > attackConnectProgress && !shaken) {
                    shaken = true

                    var shake = new ShakePosition(receivingCopy, {
                        duration: 300,
                        magnitude: 20,
                    })

                    shake.shake()

                    if (isReceivingDead) {
                        shake.on('complete', () => {
                            var tweenDip : Phaser.Types.Tweens.TweenBuilderConfig = {
                                targets: receiving.container(),
                                x: receiving.container().x,
                                y: receiving.container().y + directionToReceiver * dippingDistance,
                                duration: 200,
                                ease: "Sine.easeOut",
                                delay: 300
                            }

                            this.scene.tweens.add(tweenDip)
                        })
                    }
                }
            }

            var tweenRetreat : Phaser.Types.Tweens.TweenBuilderConfig = {
                targets: attacking.container(),
                x: attacking.container().x,
                y: 0,
                duration: 200,
                ease: "Cubic.easeOut"
            }

            tweens.push(tweenRetreat)
        }

        var delayTween: Phaser.Types.Tweens.TweenBuilderConfig = {
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