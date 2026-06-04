/**
 * Application-service port for password hashing. The domain User aggregate stores
 * an opaque password hash and knows nothing about how it is produced; the concrete
 * implementation (e.g. bcrypt/argon2) lives in the infrastructure layer.
 */
export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
