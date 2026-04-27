import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import * as bcrypt from "bcrypt";
import dayjs from "dayjs";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { IPasswordResetRepository } from "../../domain/interfaces/password-reset-repository.interface";
import { IRefreshTokenRepository } from "../../domain/interfaces/refresh-token-repository.interface";
import { IAuditLogRepository } from "../../domain/interfaces/audit-log-repository.interface";
import { IEmailService } from "../../domain/interfaces/email-service.interface";
import { Password } from "../../domain/value-objects/password.vo";
import { DomainException } from "../../../../errors/domain-exception";
import { env } from "src/config/env";

@Injectable()
export class ResetPassword {
  private readonly logger = new Logger(ResetPassword.name)

  constructor(
    @Inject("IUserRepository") private readonly userRepo: IUserRepository,
    @Inject("IPasswordResetRepository")
    private readonly passwordResetRepo: IPasswordResetRepository,
    @Inject("IRefreshTokenRepository")
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject("IAuditLogRepository")
    private readonly auditLogRepo: IAuditLogRepository,
    @Inject("IEmailService")
    private readonly emailService: IEmailService,
  ) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const reset = await this.passwordResetRepo.findByTokenHash(tokenHash);

    if (!reset || reset.usedAt)
      throw new DomainException("INVALID_OR_EXPIRED_TOKEN");
    if (dayjs().isAfter(reset.expiresAt))
      throw new DomainException("INVALID_OR_EXPIRED_TOKEN");

    const user = await this.userRepo.findById(reset.userId);
    if (!user) throw new DomainException("INVALID_OR_EXPIRED_TOKEN");

    Password.validate(newPassword, user.email);

    user.passwordHash = await bcrypt.hash(
      newPassword,
      env.NODE_ENV === "production" ? 14 : 1,
    );
    await this.userRepo.update(user);

    await this.passwordResetRepo.markUsed(reset.id);
    await this.refreshTokenRepo.deleteAllByUserId(user.id);

    await this.auditLogRepo.log({
      userId: user.id,
      action: "user.password_reset",
      entity: "user",
      entityId: user.id,
    });

    try {
      await this.emailService.sendPasswordChanged({ to: user.email, fullName: user.fullName })
    } catch (err) {
      this.logger.error("Failed to send password changed email", { userId: user.id, error: err })
    }
  }
}
