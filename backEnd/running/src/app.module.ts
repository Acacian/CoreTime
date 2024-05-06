import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerMiddleware } from './common/logger/logger.middleware';
import { SlackModule } from 'nestjs-slack-webhook';
import { CodesModule } from './codes/codes.module';
import { WinstonLogger } from './common/logger/winstonLogger.service';
import { RedisModule } from './redis/redis.module';
import { MqModule } from './mq/mq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SlackModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          type: 'webhook',
          url: configService.get<string>('WEB_HOOK_URL'),
        };
      },
      inject: [ConfigService],
    }),
    CodesModule,
    MqModule,
    RedisModule,
  ],
  controllers: [],
  providers: [WinstonLogger],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
