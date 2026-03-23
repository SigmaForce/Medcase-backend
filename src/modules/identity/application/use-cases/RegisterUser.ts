import { Inject, Injectable } from "@nestjs/common";
import { randomBytes, createHash } from "crypto";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../infra/database/prisma.service";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { ISubscriptionRepository } from "../../../subscription/domain/interfaces/subscription-repository.interface";
import { IInviteCodeRepository } from "../../../subscription/domain/interfaces/invite-code-repository.interface";
import { IEmailVerificationRepository } from "../../domain/interfaces/email-verification-repository.interface";
import { IEmailService } from "../../domain/interfaces/email-service.interface";
import { IAuditLogRepository } from "../../domain/interfaces/audit-log-repository.interface";
import { User } from "../../domain/entities/user.entity";
import { EmailVerification } from "../../domain/entities/email-verification.entity";
import { Subscription } from "../../../subscription/domain/entities/subscription.entity";
import { Password } from "../../domain/value-objects/password.vo";
import { DomainException } from "../../../../errors/domain-exception";
import { registerUserSchema } from "../dtos/register-user.dto";
import { UserResponseDto } from "../dtos/user-response.dto";
import { PostHogService } from "../../../analytics/infrastructure/services/posthog.service";
import { env } from "src/config/env";

export interface RegisterUserInput {
  email: string;
  password: string;
  fullName: string;
  country: string;
  university: string;
  invite_code?: string;
  ipAddress?: string;
}

export interface RegisterUserOutput {
  user: UserResponseDto;
  message: string;
}

@Injectable()
export class RegisterUser {
  constructor(
    @Inject("IUserRepository") private readonly userRepo: IUserRepository,
    @Inject("ISubscriptionRepository")
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject("IInviteCodeRepository")
    private readonly inviteCodeRepo: IInviteCodeRepository,
    @Inject("IEmailVerificationRepository")
    private readonly emailVerificationRepo: IEmailVerificationRepository,
    @Inject("IEmailService") private readonly emailService: IEmailService,
    @Inject("IAuditLogRepository")
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly prisma: PrismaService,
    private readonly postHogService: PostHogService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const data = registerUserSchema.parse(input);

    Password.validate(data.password, data.email);

    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new DomainException("EMAIL_ALREADY_EXISTS");

    let inviteTrialDays: number | null = null;
    if (data.invite_code) {
      const invite = await this.inviteCodeRepo.findValid(data.invite_code);
      if (!invite) throw new DomainException("INVALID_OR_EXPIRED_INVITE");
      inviteTrialDays = invite.trialDays;
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      env.NODE_ENV === "production" ? 14 : 1,
    );

    const user = User.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      country: data.country,
      university: data.university,
    });

    const createdUser = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const dbUser = await tx.user.create({
          data: {
            email: user.email,
            passwordHash: user.passwordHash,
            fullName: user.fullName,
            country: user.country,
            university: user.university,
            role: user.role,
            isActive: user.isActive,
          },
        });

        const subscription =
          inviteTrialDays !== null
            ? Subscription.createTrial(dbUser.id, inviteTrialDays)
            : Subscription.createFree(dbUser.id);

        await tx.subscription.create({
          data: {
            userId: dbUser.id,
            plan: subscription.plan,
            status: subscription.status,
            casesLimit: subscription.casesLimit,
            casesUsed: subscription.casesUsed,
            generationsLimit: subscription.generationsLimit,
            generationsUsed: subscription.generationsUsed,
            usageResetAt: subscription.usageResetAt,
            trialEndsAt: subscription.trialEndsAt,
          },
        });

        if (data.invite_code && inviteTrialDays !== null) {
          const invite = await this.inviteCodeRepo.findValid(data.invite_code);
          if (invite) await this.inviteCodeRepo.markAsUsed(invite.id, dbUser.id);
        }

        return dbUser;
      },
    );

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const emailVerification = EmailVerification.create(
      createdUser.id,
      tokenHash,
    );
    await this.emailVerificationRepo.create(emailVerification);

    await this.emailService.sendEmailConfirmation({
      to: createdUser.email,
      token: rawToken,
      fullName: createdUser.fullName,
    });

    await this.auditLogRepo.log({
      userId: createdUser.id,
      action: "user.registered",
      entity: "user",
      entityId: createdUser.id,
      ipAddress: input.ipAddress,
    });

    this.postHogService.track(createdUser.id, "user_registered", {
      country: createdUser.country,
      university: createdUser.university,
      method: data.invite_code ? "invite" : "organic",
    });

    return {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        fullName: createdUser.fullName,
        country: createdUser.country,
        university: createdUser.university,
        role: createdUser.role as User["role"],
        isActive: createdUser.isActive,
        createdAt: createdUser.createdAt,
      },
      message: "Conta criada. Verifique seu e-mail para confirmar.",
    };
  }
}
