import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SequelizeModule } from '@nestjs/sequelize';
import { RestaurantModel } from 'src/restaurant/restaurant.model';
import { JobController } from './job.controller';
import { JobModel } from './job.model';
import { JobService } from './job.service';

@Module({
  imports: [
    SequelizeModule.forFeature([JobModel, RestaurantModel]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.getOrThrow<string>('RABBITMQ_HOST');
          const port = configService.getOrThrow<string>('RABBITMQ_PORT');
          const user = configService.getOrThrow<string>('RABBITMQ_USER');
          const pw = configService.getOrThrow<string>('RABBITMQ_PW');
          const queue = configService.getOrThrow<string>('RABBITMQ_QUEUE');
          return {
            transport: Transport.RMQ,
            options: {
              urls: [`amqp://${user}:${pw}@${host}:${port}`],
              queue,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
  ],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
