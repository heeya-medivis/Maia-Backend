import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.API_URL,
        process.env.WEB_URL,
        'https://surgicalar.com',
      ];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin matches
      if (
        allowedOrigins.includes(origin) ||
        origin.includes('localhost') ||
        origin.endsWith('.surgicalar.com')
      ) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Maia API')
    .setDescription('SurgicalAR Maia Backend API')
    .setVersion('2.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Device-ID', in: 'header' }, 'device-id')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════╗
║          MAIA API SERVER (NestJS)         ║
╠═══════════════════════════════════════════╣
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(26)}║
║  Port: ${port.toString().padEnd(33)}║
║  Swagger: http://localhost:${port}/api/docs${' '.repeat(4)}║
╚═══════════════════════════════════════════╝
  `);
}

bootstrap();
