import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import store from 'cache-manager-redis-store';
import { BrowserModule } from './browser/browser.module';
import { ScraperModule } from './scraper/scraper.module';

const CACHE_TTL = 2592000; // 30 days

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: store,
        host: configService.getOrThrow<string>('REDIS_HOST'),
        port: configService.getOrThrow<number>('REDIS_PORT'),
        ttl: CACHE_TTL,
      }),
    }),
    BrowserModule,
    ScraperModule,
  ],
})
export class AppModule {}
