class CardPickConfig {
    durationRetreat: number = 150
    easeRetreat: String = 'Cubic.easeOut'
    durationRise: number = 200
    easeRise: String = 'Quint.easeOut'
    riseOffset: number = 40

    constructor(newConfig?: Partial<CardPickConfig>)
    {
        Object.assign(this, newConfig)        
    }
}

export default CardPickConfig;