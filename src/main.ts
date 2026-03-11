import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import { AppModule } from './app.module'

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule)
  app.enableCors()

  const config = new DocumentBuilder()
    .setTitle('RevalidAI API')
    .setDescription('API da plataforma de simulação clínica interativa RevalidAI')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('api-json', app, document, {
    jsonDocumentUrl: 'api-json',
  })

  app.use(
    '/docs',
    apiReference({
      spec: { content: document },
    }),
  )

  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
