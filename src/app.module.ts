import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventModule } from './presentation/event/event.module';
import { UserModule } from './presentation/user/user.module';

@Module({
  imports: [EventModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
