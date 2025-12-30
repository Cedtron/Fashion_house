import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('DB_HOST', 'localhost');
        const port = configService.get<number>('DB_PORT', 3306);
        const username = configService.get('DB_USERNAME', 'root');
        const password = configService.get('DB_PASSWORD', '');
        const database = configService.get('DB_DATABASE', 'fashion_house');

        // Try to create database if it doesn't exist
        try {
          const connection = await mysql.createConnection({
            host,
            port,
            user: username,
            password,
            multipleStatements: true,
          });
          await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
          await connection.end();
        } catch (err) {
          // Log but don't crash - TypeORM will surface connection errors as well
          // eslint-disable-next-line no-console
          console.warn('Could not create database automatically:', err?.message || err);
        }

        return {
          type: 'mysql',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get('DB_SYNCHRONIZE', 'true') === 'true',
          logging: configService.get('DB_LOGGING', 'false') === 'true',
          charset: 'utf8mb4',
          timezone: '+00:00',
        };
      },
    }),
  ],
})
export class DatabaseModule {}

