import { Double, Int32, Long } from "mongodb"

declare namespace DbTypes {
    type Challenge = {
        _id: Long
        players: {
            challengingPlayerId: Long
            challengedPlayerId: Long
        }
        title?: string
        suggestedTime?: Date
        suggestedByPlayerId?: Long
        matchTime?: Date
        reportTime?: Date
        confirmedTime?: Date
        closeTime?: Date
        voidTime?: Date
        rematchedTime?: Date
        rematchRequestedByPlayerId?: Long
        season?: Long
        postseason?: boolean
        stats?: {
            challengingPlayer?: ChallengeStats
            challengedPlayer?: ChallengeStats
        },
        ratings?: {
            challengingPlayerRating?: Double,
            challengedPlayerRating?: Double,
            change?: Double
        }
    }

    type ChallengeStats = {
        won?: boolean
        depth?: Int32
        time?: Int32
        completed?: boolean
        comment?: string
    }

    type ChallengeUpcomingChallenge = {
        matchTime: Date
        challengingPlayerName: string
        challengedPlayerName: string
    }

    type Counters = {
        _id: string
        value: Long
    }

    type Player = {
        _id: Long
        discordId: string
        name?: string
        timezone?: string
        active: boolean
    }

    type Rating = {
        _id: string
        playerId: Long
        season: Long
        rating: Double
    }

    type Season = {
        _id: Long
        startDate: Date
        endDate: Date
        K: Int32
    }
}

export = DbTypes
