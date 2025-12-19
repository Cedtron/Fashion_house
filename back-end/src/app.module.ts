import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CategoriesModule } from './categories/categories.module';
import { SubCategoriesModule } from './subcategories/subcategories.module';
import { AuthModule } from './auth/auth.module';
import { LogsModule } from './logs/logs.module';
import { SqlModule } from './sql/sql.module';
import { StockModule } from './stock/stock.module';
import { CommonModule } from './common/common.module';
import { ShadesModule } from './shades/shades.module';
import { GoogleAiModule } from './vertex-ai/vertex-ai.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Database connection
    DatabaseModule,
    // Common module for shared services
    CommonModule,
    // Feature modules
    UsersModule,
    SuppliersModule,
    CategoriesModule,
    SubCategoriesModule,
    AuthModule,
    LogsModule,
    SqlModule,
    StockModule,
    ShadesModule,
    GoogleAiModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
