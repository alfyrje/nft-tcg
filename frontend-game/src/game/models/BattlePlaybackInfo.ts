import CardCollectionInfo from "./CardCollectionInfo";

class DeckData {
    ownerAddress: string
    cardCollectionInfo: CardCollectionInfo

    constructor(partialData?: Partial<DeckData>) {
        Object.assign(this, partialData)
    }
}

class BattlePlaybackInfo {
    attacks: CardAttackPlaybackInfo[]

    deckA: DeckData;
    deckB: DeckData;

    deckWonIndex: integer

    constructor(partialData?: Partial<BattlePlaybackInfo>) {
        Object.assign(this, partialData)
    }
}

export { DeckData, BattlePlaybackInfo }