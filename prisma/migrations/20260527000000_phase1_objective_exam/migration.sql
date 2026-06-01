-- CreateEnum
CREATE TYPE "ObjectiveQuestionSource" AS ENUM ('inep', 'ai_generated');

-- CreateEnum
CREATE TYPE "ObjectiveSimulationStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "objective_questions" (
    "id" UUID NOT NULL,
    "specialty_id" INTEGER,
    "created_by" UUID,
    "stem" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL,
    "correct_alternative" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" "CaseDifficulty" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'pending_review',
    "source_type" "ObjectiveQuestionSource" NOT NULL,
    "source_label" TEXT NOT NULL,
    "year" INTEGER,
    "edition" TEXT,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_annulled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objective_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_simulations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "ObjectiveSimulationStatus" NOT NULL DEFAULT 'in_progress',
    "question_count" INTEGER NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "question_order" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "timed_limit_secs" INTEGER NOT NULL DEFAULT 18000,
    "score_total" INTEGER,
    "score_percent" DECIMAL(5,2),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_secs" INTEGER,

    CONSTRAINT "objective_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "simulation_id" UUID,
    "selected_alternative" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "time_spent_secs" INTEGER,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objective_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "objective_questions_external_id_key" ON "objective_questions"("external_id");

-- CreateIndex
CREATE INDEX "objective_questions_status_source_type_idx" ON "objective_questions"("status", "source_type");

-- CreateIndex
CREATE INDEX "objective_questions_specialty_id_idx" ON "objective_questions"("specialty_id");

-- CreateIndex
CREATE INDEX "objective_questions_difficulty_idx" ON "objective_questions"("difficulty");

-- CreateIndex
CREATE INDEX "objective_questions_year_edition_idx" ON "objective_questions"("year", "edition");

-- CreateIndex
CREATE INDEX "objective_simulations_user_id_started_at_idx" ON "objective_simulations"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "objective_simulations_status_idx" ON "objective_simulations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "objective_attempts_simulation_id_question_id_key" ON "objective_attempts"("simulation_id", "question_id");

-- CreateIndex
CREATE INDEX "objective_attempts_user_id_answered_at_idx" ON "objective_attempts"("user_id", "answered_at" DESC);

-- CreateIndex
CREATE INDEX "objective_attempts_question_id_idx" ON "objective_attempts"("question_id");

-- AddForeignKey
ALTER TABLE "objective_questions" ADD CONSTRAINT "objective_questions_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_questions" ADD CONSTRAINT "objective_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_simulations" ADD CONSTRAINT "objective_simulations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_attempts" ADD CONSTRAINT "objective_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_attempts" ADD CONSTRAINT "objective_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "objective_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_attempts" ADD CONSTRAINT "objective_attempts_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "objective_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
