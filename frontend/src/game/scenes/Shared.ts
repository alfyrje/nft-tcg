import WebFont from "webfontloader"

function initLoadCardAssets() {
    const element = document.createElement('style');
    document.head.appendChild(element);

    const sheet = element.sheet;

    let styles = '@font-face { font-family: "CardTitleFont"; src: url("assets/fonts/GraenMetal.otf") format("opentype"); }\n';

    sheet?.insertRule(styles, 0);
}

function loadCardAssets(scene: Phaser.Scene) {
    // Load assets
    scene.load.setPath("assets")
    
    scene.load.image('cardBackground', 'cardVisual/CardBackground_RuinWall.png')
    scene.load.image('cardFrame', 'cardVisual/CardFrame_Gold.png')
    scene.load.image('namePlate', 'cardVisual/NamePlate_ShinyGold.png')
    scene.load.image('cardArtFrame', 'cardVisual/CardArtFrame_Gold.png')
    scene.load.image('cardSelectedBackground', 'cardVisual/CardBackground_Highlight.png')
    scene.load.spritesheet('buttonBSheet', 'ui/buttonSheet.png', { frameWidth: 96, frameHeight: 22 })
    scene.load.image('generalBackground', 'background/bg1.png')

    scene.load.image('bg1', 'background/bg1.png')
    scene.load.image('bg2', 'background/bg2.png')
    scene.load.image('bg3', 'background/bg3.png')
    scene.load.image('bg4', 'background/bg4.png')

    WebFont.load({
        custom: {
            families: [ 'CardTitleFont' ]
        },
    })
}

export { loadCardAssets, initLoadCardAssets }