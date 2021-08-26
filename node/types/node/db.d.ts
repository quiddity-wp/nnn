import { Challenge, Counters, Player, Rating, Season } from "./dbTypes"

declare module "mongodb" {
    export interface Db {
        collection<TSchema = Challenge>(name: "challenge", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Counters>(name: "counters", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Player>(name: "player", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Rating>(name: "rating", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Season>(name: "season", options?: CollectionOptions): Collection<TSchema>
    }
}
