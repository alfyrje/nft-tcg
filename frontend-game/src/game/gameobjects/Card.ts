export default class Card {
    scene: Phaser.Scene;
    container: Phaser.GameObjects.Container

    constructor(scene: Phaser.Scene, x: integer, y: integer) {
        this.scene = scene
        this.container = this.scene.make.container({
            x: x,
            y: y
        }, true)

        var background = this.scene.make.image({
            key: 'cardBackground',
            x: 0,
            y: 0,
            add: false
        })

        background.setScale(1.5)

        var cardFrame = this.scene.make.image({
            key: 'cardFrame',
            x: 0,
            y: 0,
            add: false
        })

        cardFrame.setScale(1.5)

        var artFrame = this.scene.make.image({
            key: 'cardArtFrame',
            x: 0,
            y: -30,
            add: false
        })

        artFrame.setScale(1.5)

        var namePlate = this.scene.make.image({
            key: "namePlate",
            x: 0,
            y: 60
        })

        namePlate.setScale(1.5)

        var nameLabel = this.scene.make.text({
            x: 0,
            y: 48
        }, false)

        nameLabel.setFontFamily("CardTitleFont")
        nameLabel.setAlign("center")
        nameLabel.setFontSize(20)
        nameLabel.setColor("#000000")

        nameLabel.setText("Legendary shitty")

        nameLabel.x = -nameLabel.displayWidth / 2

        this.container.x = background.width
        this.container.y = background.height

        this.container.add(background)
        this.container.add(namePlate)
        this.container.add(nameLabel)
        this.container.add(artFrame)
        //this.container.add(cardFrame)
    }
}