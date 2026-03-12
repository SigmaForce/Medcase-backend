import { z } from 'zod'

export const VALID_ISSUES = [
  'clinically_inaccurate',
  'confusing',
  'outdated',
  'poor_portuguese',
  'other',
] as const

export const submitRatingSchema = z
  .object({
    score: z.number().int().min(1).max(5),
    issues: z.array(z.enum(VALID_ISSUES)).optional(),
    comment: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.score <= 3) {
      if (!val.issues || val.issues.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['issues'],
          message: 'ISSUES_REQUIRED',
        })
      }
      if (!val.comment || val.comment.trim().length < 20) {
        ctx.addIssue({
          code: 'custom',
          path: ['comment'],
          message: 'COMMENT_REQUIRED',
        })
      }
    }
  })

export type SubmitRatingDto = z.infer<typeof submitRatingSchema>
