import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { RestaurantModel } from 'src/restaurant/restaurant.model';

@Table({ tableName: 'jobs' })
export class JobModel extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare jobId: string;

  @ForeignKey(() => RestaurantModel)
  @Column({ type: DataType.INTEGER })
  declare restaurantId: number;

  @Column({
    type: DataType.ENUM('queued', 'processed', 'failed'),
    defaultValue: 'queued',
  })
  declare status: string;

  @Column({
    type: DataType.TEXT,
  })
  declare error: string;
}
