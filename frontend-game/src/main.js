import { Start } from './scenes/Start.js';
import { ChooseCard } from './scenes/ChooseCard.js'

const config = {
    type: Phaser.AUTO,
    title: 'Card Attack',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    pixelArt: false,
    scene: [
        ChooseCard
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            