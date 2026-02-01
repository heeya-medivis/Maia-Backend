import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

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

  // CORS - uses CORS_ORIGINS env var plus common patterns
  const corsOrigins =
    process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check against configured origins
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (
        process.env.NODE_ENV !== "production" &&
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }

      // Allow surgicalar.com subdomains (HTTPS only)
      if (
        origin === "https://maia.surgicalar.com" ||
        origin === "https://maia-staging.surgicalar.com"
      ) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-ID"],
    exposedHeaders: ["X-Request-Id"],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Maia API")
    .setDescription("SurgicalAR Maia Backend API")
    .setVersion("2.0")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", name: "X-Device-ID", in: "header" },
      "device-id",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  const apiUrl = process.env.API_URL || `http://localhost:${port}`;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════╗
║          MAIA API SERVER (NestJS)         ║
╠═══════════════════════════════════════════╣
║  Environment: ${(process.env.NODE_ENV || "development").padEnd(26)}║
║  Port: ${port.toString().padEnd(33)}║
║  Swagger: ${apiUrl}/api/docs${" ".repeat(Math.max(0, 16 - apiUrl.length + 22))}║
╚═══════════════════════════════════════════╝
  `);
}

bootstrap();
