import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JobModel } from 'src/job/job.model';
import { MenuFileModel } from './menu-file/menu-file.model';
import { OfferingModel } from './offering/offering.model';
import { RestaurantEventController } from './restaraunt.listener';
import { RestaurantController } from './restaurant.controller';
import { RestaurantModel } from './restaurant.model';
import { RestaurantService } from './restaurant.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      RestaurantModel,
      OfferingModel,
      MenuFileModel,
      JobModel,
    ]),
  ],
  controllers: [RestaurantController, RestaurantEventController],
  providers: [RestaurantService],
})
export class RestaurantModule {}
