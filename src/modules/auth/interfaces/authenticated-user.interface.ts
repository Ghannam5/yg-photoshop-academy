export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}
