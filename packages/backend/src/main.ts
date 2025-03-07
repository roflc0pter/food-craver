import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap() {
  const host = process.env.RABBITMQ_HOST;
  const port = process.env.RABBITMQ_PORT;
  const user = process.env.RABBITMQ_USER;
  const pw = process.env.RABBITMQ_PW;
  const queue = process.env.RABBITMQ_QUEUE;
  if (!host || !port || !user || !pw || !queue) {
    throw new Error('Missing rabbitmq config');
  }

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

  const app = await NestFactory.create(AppModule);

  app.use(
    morgan('combined', {
      stream: {
        write: (message) => Logger.log(message.trim()),
      },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const options = new DocumentBuilder()
    .setTitle('Food Craver API')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  } as SwaggerCustomOptions);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
