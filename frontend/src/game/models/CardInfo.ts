import CardElement from "./CardElement";
import CardRarity from "./CardRarity";

class CardInfo
{
    attack: integer;
    health: integer;
    speed?: integer;
    element?: CardElement;
    rarity?: CardRarity;
    name?: string;
    id?: string;
    imageUrl?: string;

    constructor(init?: Partial<CardInfo>) {
        Object.assign(this, init)
    }
}

export default CardInfo