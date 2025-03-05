import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const host = process.env.RABBITMQ_HOST!;
  const port = process.env.RABBITMQ_PORT!;
  const user = process.env.RABBITMQ_USER!;
  const pw = process.env.RABBITMQ_PW!;
  const queue = process.env.RABBITMQ_QUEUE!;
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${user}:${pw}@${host}:${port}`],
        queue,
        queueOptions: { durable: true },
      },
    },
  );

  const configService = app.get(ConfigService);
  console.log(
    `Scraper Microservice listening on queue: ${configService.get('RABBITMQ_QUEUE')}`,
  );

  await app.listen();
}
bootstrap();
