import { IUseCase } from '../../../../common/application/use-case.interface';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { Email } from '../../../../domain/user/value-objects/email.vo';
import { UserNotFoundError } from '../../errors/user-not-found.error';
import { UserProfileDto } from '../../dtos/user.dto';
import { toUserProfileDto } from '../../dtos/user.mapper';
import { GetUserByEmailQuery } from './get-user-by-email.query';

export class GetUserByEmailHandler implements IUseCase<
  GetUserByEmailQuery,
  UserProfileDto
> {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserByEmailQuery): Promise<UserProfileDto> {
    const email = new Email(query.email);
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError(email.value);
    }

    return toUserProfileDto(user);
  }
}
