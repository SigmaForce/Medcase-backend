import { Module } from '@nestjs/common'
import { PrismaObjectiveExamRepository } from './infrastructure/repositories/prisma-objective-exam.repository'
import { ObjectiveQuestionSelectorService } from './domain/services/objective-question-selector.service'
import { AnswerObjectiveQuestion } from './application/use-cases/AnswerObjectiveQuestion'
import { CompleteObjectiveSimulation } from './application/use-cases/CompleteObjectiveSimulation'
import { CreateObjectiveSimulation } from './application/use-cases/CreateObjectiveSimulation'
import { GetObjectivePerformance } from './application/use-cases/GetObjectivePerformance'
import { GetObjectiveQuestion } from './application/use-cases/GetObjectiveQuestion'
import { GetObjectiveSimulation } from './application/use-cases/GetObjectiveSimulation'
import { ImportInepObjectiveQuestions } from './application/use-cases/ImportInepObjectiveQuestions'
import { ListObjectiveQuestions } from './application/use-cases/ListObjectiveQuestions'
import { ListObjectiveSimulations } from './application/use-cases/ListObjectiveSimulations'
import { SaveObjectiveSimulationAnswer } from './application/use-cases/SaveObjectiveSimulationAnswer'
import { SyncObjectiveSimulationActivity } from './application/use-cases/SyncObjectiveSimulationActivity'
import { Phase1AdminController } from './presentation/controllers/phase1-admin.controller'
import { Phase1QuestionController } from './presentation/controllers/phase1-question.controller'
import { Phase1SimulationController } from './presentation/controllers/phase1-simulation.controller'

@Module({
  providers: [
    { provide: 'IObjectiveExamRepository', useClass: PrismaObjectiveExamRepository },
    ObjectiveQuestionSelectorService,
    AnswerObjectiveQuestion,
    CompleteObjectiveSimulation,
    CreateObjectiveSimulation,
    GetObjectivePerformance,
    GetObjectiveQuestion,
    GetObjectiveSimulation,
    ImportInepObjectiveQuestions,
    ListObjectiveQuestions,
    ListObjectiveSimulations,
    SaveObjectiveSimulationAnswer,
    SyncObjectiveSimulationActivity,
  ],
  controllers: [Phase1QuestionController, Phase1SimulationController, Phase1AdminController],
})
export class Phase1Module {}
