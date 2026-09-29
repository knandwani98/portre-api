import { clerkClient, getAuth } from '@clerk/express';
import type { NextFunction, Request, Response } from 'express';
import { UsersService } from '../modules/users/users.service.js';
import { unauthorized } from '../types/app-error.js';

const usersService = new UsersService();

export type AuthedRequest = Request & {
  appUser: {
    id: string;
    clerkId: string;
    email: string;
  };
};

export async function requireAppUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      throw unauthorized();
    }

    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw unauthorized('Account has no email address');
    }

    const user = await usersService.upsertFromClerk({
      clerkId: auth.userId,
      email,
    });

    (req as AuthedRequest).appUser = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
    };
    next();
  } catch (error) {
    next(error);
  }
}
