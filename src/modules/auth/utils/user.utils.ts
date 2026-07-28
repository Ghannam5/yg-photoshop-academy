export function toPublicUser(user: any) {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
}
