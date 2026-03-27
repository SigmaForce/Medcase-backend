import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { env } from './config/env'

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })
  app.set('trust proxy', 1)
  app.use(helmet())
  app.enableCors({ origin: env.APP_URL, credentials: true })

  if (env.NODE_ENV !== 'production') {
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
  }

  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
