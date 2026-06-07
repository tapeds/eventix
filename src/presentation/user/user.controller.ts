import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RegisterUserHandler } from '../../application/user/commands/register-user/register-user.handler';
import { RegisterUserCommand } from '../../application/user/commands/register-user/register-user.command';
import { ChangeUserRoleHandler } from '../../application/user/commands/change-user-role/change-user-role.handler';
import { ChangeUserRoleCommand } from '../../application/user/commands/change-user-role/change-user-role.command';
import { GetUserProfileHandler } from '../../application/user/queries/get-user-profile/get-user-profile.handler';
import { GetUserProfileQuery } from '../../application/user/queries/get-user-profile/get-user-profile.query';
import { GetUserByEmailHandler } from '../../application/user/queries/get-user-by-email/get-user-by-email.handler';
import { GetUserByEmailQuery } from '../../application/user/queries/get-user-by-email/get-user-by-email.query';
import { UserProfileDto } from '../../application/user/dtos/user.dto';
import { UserRoleEnum } from '../../domain/user/value-objects/user-role.vo';

interface RegisterUserBody {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

interface ChangeUserRoleBody {
  role?: string;
}

function parseRole(role: string | undefined): UserRoleEnum {
  if (!role || !Object.values(UserRoleEnum).includes(role as UserRoleEnum)) {
    throw new BadRequestException(
      `role must be one of: ${Object.values(UserRoleEnum).join(', ')}`,
    );
  }
  return role as UserRoleEnum;
}

@Controller('users')
export class UserController {
  constructor(
    private readonly registerUser: RegisterUserHandler,
    private readonly changeUserRole: ChangeUserRoleHandler,
    private readonly getUserProfile: GetUserProfileHandler,
    private readonly getUserByEmail: GetUserByEmailHandler,
  ) {}

  @Post()
  async register(@Body() body: RegisterUserBody): Promise<{ userId: string }> {
    if (!body.name || !body.email || !body.password) {
      throw new BadRequestException('name, email and password are required');
    }
    const role = parseRole(body.role);
    return this.registerUser.execute(
      new RegisterUserCommand(body.name, body.email, body.password, role),
    );
  }

  @Patch(':id/role')
  @HttpCode(204)
  async changeRole(
    @Param('id') id: string,
    @Body() body: ChangeUserRoleBody,
  ): Promise<void> {
    const role = parseRole(body.role);
    await this.changeUserRole.execute(new ChangeUserRoleCommand(id, role));
  }

  @Get('by-email')
  async byEmail(@Query('email') email: string): Promise<UserProfileDto> {
    if (!email) {
      throw new BadRequestException('email query parameter is required');
    }
    return this.getUserByEmail.execute(new GetUserByEmailQuery(email));
  }

  @Get(':id')
  async profile(@Param('id') id: string): Promise<UserProfileDto> {
    return this.getUserProfile.execute(new GetUserProfileQuery(id));
  }
}
