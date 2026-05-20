import {
  createSwaggerDocumentConfig,
  SWAGGER_JSON_PATH,
  SWAGGER_UI_PATH,
} from './swagger.config';

describe('Swagger configuration', () => {
  it('uses stable public paths for the UI and OpenAPI JSON', () => {
    expect(SWAGGER_UI_PATH).toBe('api-docs');
    expect(SWAGGER_JSON_PATH).toBe('api-docs-json');
  });

  it('describes the Riido API with bearer auth and the /api base path', () => {
    const config = createSwaggerDocumentConfig();

    expect(config.info.title).toBe('P07 Riido RAG API');
    expect(config.info.description).toContain('Riido');
    expect(config.info.version).toBe('1.0');
    expect(config.servers).toEqual([{ url: '/api' }]);
    expect(config.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });
});
