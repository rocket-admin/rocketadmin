export enum PlanKey {
    Free = 'free',
    Tean = 'team',
    Enterprise = 'enterprise',
}

export interface PricePlan {
    key: PlanKey,
    name: string,
    price: number,
}