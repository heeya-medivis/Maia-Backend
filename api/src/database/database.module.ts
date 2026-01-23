import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase, DATABASE_CONNECTION } from './database.provider';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
        return createDatabase(databaseUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
