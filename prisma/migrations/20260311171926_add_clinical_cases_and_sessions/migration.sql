-- CreateEnum
CREATE TYPE "CaseDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "CaseLanguage" AS ENUM ('pt', 'es');

-- CreateEnum
CREATE TYPE "CountryContext" AS ENUM ('BR', 'PY');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'regenerating');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "specialties" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name_pt" TEXT NOT NULL,
    "name_es" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_cases" (
    "id" UUID NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "title" TEXT NOT NULL,
    "difficulty" "CaseDifficulty" NOT NULL,
    "language" "CaseLanguage" NOT NULL,
    "country_context" "CountryContext" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'pending_review',
    "case_brief" JSONB NOT NULL,
    "available_exams" JSONB NOT NULL DEFAULT '{}',
    "generation_prompt" TEXT,
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_ratings" INTEGER NOT NULL DEFAULT 0,
    "flagged_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'in_progress',
    "submitted_diagnosis" TEXT,
    "submitted_management" TEXT,
    "feedback" JSONB,
    "requested_exams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missed_key_exams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_secs" INTEGER,
    "is_timed" BOOLEAN NOT NULL DEFAULT false,
    "timed_limit_secs" INTEGER NOT NULL DEFAULT 2700,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_performance" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "avg_score_total" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_history_taking" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_differential" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_diagnosis" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_exams" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_management" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_session_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_slug_key" ON "specialties"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_id_case_id_key" ON "sessions"("user_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_performance_user_id_specialty_id_key" ON "student_performance"("user_id", "specialty_id");

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "clinical_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_performance" ADD CONSTRAINT "student_performance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_performance" ADD CONSTRAINT "student_performance_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
