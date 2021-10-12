import { Challenge, Counters, Player, Rating, Season } from "./dbTypes"
import MongoDb from "mongodb"

declare module "mongodb" {
    export interface Db {
        collection<TSchema = Challenge>(name: "challenge", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Counters>(name: "counters", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Player>(name: "player", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Rating>(name: "rating", options?: CollectionOptions): Collection<TSchema>
        collection<TSchema = Season>(name: "season", options?: CollectionOptions): Collection<TSchema>
    }

    // The default implementation of aggregate's generic (<T = Document>) is too restrictive, so we change it here to suit our needs.
    export interface Collection {
        aggregate<T = any>(pipeline?: MongoDb.Document[], options?: AggregateOptions): AggregationCursor<T>;
    }
}
