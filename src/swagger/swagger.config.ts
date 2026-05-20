import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api-docs';
export const SWAGGER_JSON_PATH = 'api-docs-json';

export function createSwaggerDocumentConfig() {
  return new DocumentBuilder()
    .setTitle('P07 Riido RAG API')
    .setDescription('Riido 서비스 가이드 문서 기반 RAG 챗봇 API')
    .setVersion('1.0')
    .addServer('/api')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();
}

export function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, createSwaggerDocumentConfig());

  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
