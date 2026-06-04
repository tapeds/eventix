/** Read-model for a user profile returned by the User query handlers. */
export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
