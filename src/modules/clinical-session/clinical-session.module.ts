import { Module } from '@nestjs/common'
import { IdentityModule } from '../identity/identity.module'

// Repository
import { PrismaSessionRepository } from './infrastructure/repositories/prisma-session.repository'

// Infrastructure Services
import { OpenAiAdapter } from './infrastructure/services/openai.adapter'
import { AntiCheatGuard } from './infrastructure/services/anti-cheat.guard'
import { ExamDetectorService } from './infrastructure/services/exam-detector.service'
import { ExamExtractorService } from './infrastructure/services/exam-extractor.service'
import { ExamMatchService } from './infrastructure/services/exam-match.service'
import { ChatOrchestratorService } from './infrastructure/services/chat-orchestrator.service'
import { FeedbackGeneratorService } from './infrastructure/services/feedback-generator.service'
import { PerformanceUpdaterService } from './infrastructure/services/performance-updater.service'
import { StreakUpdaterService } from './infrastructure/services/streak-updater.service'
import { BadgeAwarderService } from './infrastructure/services/badge-awarder.service'

// Use Cases
import { StartSession } from './application/use-cases/StartSession'
import { SendMessage } from './application/use-cases/SendMessage'
import { CompleteSession } from './application/use-cases/CompleteSession'
import { AbandonSession } from './application/use-cases/AbandonSession'
import { GetSession } from './application/use-cases/GetSession'
import { ListSessions } from './application/use-cases/ListSessions'

// Controllers
import { SessionController } from './presentation/controllers/session.controller'
import { MessageController } from './presentation/controllers/message.controller'
import { CompleteController } from './presentation/controllers/complete.controller'

@Module({
  imports: [IdentityModule],
  providers: [
    { provide: 'ISessionRepository', useClass: PrismaSessionRepository },
    OpenAiAdapter,
    AntiCheatGuard,
    ExamDetectorService,
    ExamExtractorService,
    ExamMatchService,
    ChatOrchestratorService,
    FeedbackGeneratorService,
    PerformanceUpdaterService,
    StreakUpdaterService,
    BadgeAwarderService,
    StartSession,
    SendMessage,
    CompleteSession,
    AbandonSession,
    GetSession,
    ListSessions,
  ],
  controllers: [SessionController, MessageController, CompleteController],
  exports: ['ISessionRepository'],
})
export class ClinicalSessionModule {}
