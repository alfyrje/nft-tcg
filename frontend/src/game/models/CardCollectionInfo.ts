import CardInfo from "./CardInfo";

class CardCollectionInfo {
    cardList: CardInfo[];

    constructor(newCardList: CardInfo[]) {
        this.cardList = newCardList
    }
}

export default CardCollectionInfo