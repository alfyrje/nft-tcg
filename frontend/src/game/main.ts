import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { CardMain } from './scenes/CardMain';
import { CardServerInteractor } from './scenes/CardServerInteractor';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [
        CardMain
    ],
    antialias: false,
};

const StartGame = (parent: string, serverInteractor: CardServerInteractor) => {
    var game = new Game({ ...config, parent });
    game.scene.start('CardMain', serverInteractor)
}

export default StartGame;
