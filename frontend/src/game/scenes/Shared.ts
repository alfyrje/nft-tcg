import WebFont from "webfontloader"

function initLoadCardAssets() {
    const element = document.createElement('style');
    document.head.appendChild(element);

    const sheet = element.sheet;

    let styles = '@font-face { font-family: "CardTitleFont"; src: url("assets/fonts/GraenMetal.otf") format("opentype"); }\n';

    sheet?.insertRule(styles, 0);
}

// Card visual variants for randomization
const CARD_BACKGROUNDS = [
    'CardBackground_Blue',
    'CardBackground_BrickWall',
    'CardBackground_Gray',
    'CardBackground_Green',
    'CardBackground_Red',
    'CardBackground_RuinWall',
    'CardBackground_Violet',
    'CardBackground_Yellow'
]

const CARD_FRAMES = [
    'CardFrame_Gold',
    'CardFrame_Silver',
    'CardFrame_Wooden'
]

const CARD_ART_FRAMES = [
    'CardArtFrame_Cooper',
    'CardArtFrame_Gold',
    'CardArtFrame_Silver'
]

const NAME_PLATES = [
    'NamePlate_Cooper',
    'NamePlate_Gold',
    'NamePlate_ShinyCooper',
    'NamePlate_ShinyGold',
    'NamePlate_Stone'
]

function loadCardAssets(scene: Phaser.Scene) {
    // Load assets
    scene.load.setPath("assets")
    
    // Load all card background variants
    CARD_BACKGROUNDS.forEach(bg => {
        scene.load.image(bg, `cardVisual/${bg}.png`)
    })
    
    // Load all card frame variants
    CARD_FRAMES.forEach(frame => {
        scene.load.image(frame, `cardVisual/${frame}.png`)
    })
    
    // Load all art frame variants
    CARD_ART_FRAMES.forEach(artFrame => {
        scene.load.image(artFrame, `cardVisual/${artFrame}.png`)
    })
    
    // Load all name plate variants
    NAME_PLATES.forEach(plate => {
        scene.load.image(plate, `cardVisual/${plate}.png`)
    })
    
    scene.load.image('cardSelectedBackground', 'cardVisual/CardBackground_Highlight.png')
    scene.load.spritesheet('buttonBSheet', 'ui/buttonSheet.png', { frameWidth: 96, frameHeight: 22 })
    scene.load.spritesheet('iconSheet', 'cardVisual/SheetIcon.png', { frameWidth: 32, frameHeight: 32 })
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

export { loadCardAssets, initLoadCardAssets, CARD_BACKGROUNDS, CARD_FRAMES, CARD_ART_FRAMES, NAME_PLATES }