import CardCollectionInfo from "../models/CardCollectionInfo";

class CardCollectionConfig {
    spacing: number;
    info: CardCollectionInfo;
    x: number;
    y: number;

    constructor(newConfig?: Partial<CardCollectionConfig>) {
        Object.assign(this, newConfig)
    }
}

export default CardCollectionConfig