import { ethers } from "ethers";
import CardCollectionInfo from "../models/CardCollectionInfo";
import CardInfo from "../models/CardInfo";

export class CardServerInteractor {
    private contractAddress: string;
    private abi: ethers.InterfaceAbi
    private playerAddress: string
    
    constructor(contractAddress: string, playerAddress: string, abi: ethers.InterfaceAbi) {
        this.contractAddress = contractAddress
        this.playerAddress = playerAddress
        this.abi = abi
    }

    async fetchCardCollectionInfo() : Promise<CardCollectionInfo | undefined> {
        if (!window.ethereum) return;
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const cardContract = new ethers.Contract(this.contractAddress, this.abi, signer);
        const ids = await cardContract.getTokensOfOwner(this.playerAddress);

        const loaded: CardInfo[] = [];
        for (let id of ids) {
            const c = await cardContract.getCard(id);
            // minimal info for selection
            loaded.push(
                new CardInfo({
                    id: id.toString(),
                    name: `Card #${id}`,
                    attack: Number(c.attack),
                    health: Number(c.health)
                })
            )
                //{ id: id.toString(), name: `Card #${id}`, attack: c.attack, health: c.health });
        }

        return new CardCollectionInfo(loaded);
    }
}