import type { User } from '@prisma/client';
import { UsersRepository } from './users.repository.js';

export class UsersService {
  constructor(private readonly users = new UsersRepository()) {}

  upsertFromClerk(input: { clerkId: string; email: string }): Promise<User> {
    return this.users.upsertByClerkId(input);
  }
}
