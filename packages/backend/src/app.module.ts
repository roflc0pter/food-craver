import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ServeStaticModule } from '@nestjs/serve-static';
import { JobModule } from './job/job.module';
import { RestaurantModule } from './restaurant/restaurant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          rootPath: configService.getOrThrow('UPLOADS_MOUNT_DIR'),
          serveRoot: '/uploads',
          exclude: ['/api/(.*)'],
        },
      ],
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: +configService.getOrThrow<string>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USER'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        autoLoadModels: true,
        synchronize: true,
        define: {
          timestamps: true,
          underscored: true,
          paranoid: true,
        },
        logging: (msg) => {
          Logger.debug(msg);
        },
      }),
      inject: [ConfigService],
    }),
    RestaurantModule,
    JobModule,
  ],
})
export class AppModule {}
