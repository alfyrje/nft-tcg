import { useLayoutEffect, useRef } from 'react';
import StartGame from '../game/main';
import React from 'react';

export default function PhaserGame()
{
    const currentGame = useRef(null)

    useLayoutEffect(() =>
    {
        if (currentGame.current === null)
        {
            currentGame.current = StartGame("game-container")
        }
    });

    return (
        <div id="game-container"></div>
    );
}