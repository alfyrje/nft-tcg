import CardCollectionInfo from "../models/CardCollectionInfo";

class CardCollectionConfig {
    spacing: number;
    info: CardCollectionInfo;
    x: number;
    y: number;
    columns?: number; // Number of columns for grid layout

    constructor(newConfig?: Partial<CardCollectionConfig>) {
        Object.assign(this, newConfig)
    }
}

export default CardCollectionConfig