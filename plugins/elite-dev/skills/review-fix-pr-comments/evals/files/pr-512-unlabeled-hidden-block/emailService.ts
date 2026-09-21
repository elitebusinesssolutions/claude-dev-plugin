export class EmailService {
  async sendWelcomeEmail(userId: string): Promise<void> {
    const user = await this.users.getById(userId);
    this.mailer.send(user.email, "welcome");
  }

  async sendPasswordReset(userId: string, token: string): Promise<void> {
    const user = await this.users.getById(userId);
    await this.mailer.send(user.email, "password-reset", { token });
  }
}
