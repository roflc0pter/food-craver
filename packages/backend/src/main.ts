import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const host = process.env.RABBITMQ_HOST;
  const port = process.env.RABBITMQ_PORT;
  const user = process.env.RABBITMQ_USER;
  const pw = process.env.RABBITMQ_PW;
  const queue = process.env.RABBITMQ_QUEUE;
  if (!host || !port || !user || !pw || !queue) {
    throw new Error('Missing rabbitmq config');
  }

  const app = await NestFactory.create(AppModule);
  const microservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${user}:${pw}@${host}:${port}`],
        queue: 'backend.page.queue',
        queueOptions: { durable: true },
      },
    });

  await microservice.listen();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
