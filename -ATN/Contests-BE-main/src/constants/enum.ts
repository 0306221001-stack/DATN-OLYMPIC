// src/constants/enums.ts

export enum Role {
    Admin = "Admin",
    Judge = "Judge",
}

export enum QuestionType {
    MultipleChoice = "multiple_choice",
    Essay = "essay",
}

export enum Difficulty {
    Alpha = "Alpha",
    Beta = "Beta",
    Rc = "Rc",
    Gold = "Gold",
}

export enum ContestStatus {
    Upcoming = "upcoming",
    Ongoing = "ongoing",
    Finished = "finished",
}

export enum ContestantStatus {
    Compete = "compete",
    Eliminate = "eliminate",
    Advanced = "advanced",
}

export enum ContestantMatchStatus {
    NotStarted = "not_started",
    InProgress = "in_progress",
    Confirmed1 = "confirmed1",
    Confirmed2 = "confirmed2",
    Eliminated = "eliminated",
    Rescued = "rescued",
    Banned = "banned",
    Completed = "completed",
}

export enum RescueType {
    Resurrected = "resurrected",
    LifelineUsed = "lifelineUsed",
}

export enum RescueStatus {
    NotUsed = "notUsed",
    Used = "used",
    Passed = "passed",
}

export enum AwardType {
    FirstPrize = "firstPrize",
    SecondPrize = "secondPrize",
    ThirdPrize = "thirdPrize",
    FourthPrize = "fourthPrize",
    ImpressiveVideo = "impressiveVideo",
    ExcellentVideo = "excellentVideo",
}

export enum ControlKey {
    Background = "background",
    Question = "question",
    QuestionInfo = "questionInfo",
    Answer = "answer",
    MatchDiagram = "matchDiagram",
    Explanation = "explanation",
    FirstPrize = "firstPrize",
    SecondPrize = "secondPrize",
    ThirdPrize = "thirdPrize",
    FourthPrize = "fourthPrize",
    ImpressiveVideo = "impressiveVideo",
    ExcellentVideo = "excellentVideo",
    AllPrize = "allPrize",
    TopWin = "topWin",
    ListEliminated = "listEliminated",
    ListRescued = "listRescued",
    Video = "video",
    Audio = "audio",
    Image = "image",
    Top20Winner = "top20Winner",
}

export enum ControlValue {
    Start = "start",
    Pause = "pause",
    Reset = "reset",
    ZoomIn = "zoomIn",
    ZoomOut = "zoomOut",
}