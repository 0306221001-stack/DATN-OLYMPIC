import "express";

declare global {
  namespace Express {    interface User {
      userId: number;
      username: string;
      email: string;
      password: string;
      role: string;
      isActive: boolean;
    }
    interface Request {
      user?: User;
    }
  }
}
