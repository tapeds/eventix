import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApplicationExceptionFilter } from './presentation/common/application-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApplicationExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
