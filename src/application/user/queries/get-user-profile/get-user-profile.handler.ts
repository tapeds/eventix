import { IUseCase } from '../../../../common/application/use-case.interface';
import { IUserRepository } from '../../../../domain/user/repositories/user.repository.interface';
import { UserId } from '../../../../domain/user/value-objects/user-id.vo';
import { UserNotFoundError } from '../../errors/user-not-found.error';
import { UserProfileDto } from '../../dtos/user.dto';
import { toUserProfileDto } from '../../dtos/user.mapper';
import { GetUserProfileQuery } from './get-user-profile.query';

export class GetUserProfileHandler implements IUseCase<
  GetUserProfileQuery,
  UserProfileDto
> {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserProfileQuery): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(new UserId(query.userId));
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    return toUserProfileDto(user);
  }
}
