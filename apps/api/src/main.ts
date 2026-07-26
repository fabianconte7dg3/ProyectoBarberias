import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.use(cookieParser());
  
  // Produccion: solo volumetrixpa.com y sus subdominios de tenant (uno por
  // barberia via proxy.ts en apps/web). Anclado a `^https://` y con el punto
  // explicito antes del dominio para que no matchee typosquatting tipo
  // "evil-volumetrixpa.com". Dev/CI: refleja cualquier origin, sin tocar el
  // comportamiento que ya existe (localhost y LAN).
  const PROD_ORIGIN_REGEX = /^https:\/\/([a-z0-9-]+\.)?volumetrixpa\.com$/;

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin) return callback(null, true); // sin Origin: curl, healthchecks, SSR same-host
      callback(null, PROD_ORIGIN_REGEX.test(origin));
    },
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
