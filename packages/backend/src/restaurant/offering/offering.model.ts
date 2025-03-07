import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { RestaurantModel } from '../restaurant.model';

@Table({ tableName: 'offering', timestamps: true })
export class OfferingModel extends Model {
  @PrimaryKey
  @Column({ type: DataType.INTEGER, autoIncrement: true })
  declare menuItemId: string;

  @ForeignKey(() => RestaurantModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare restaurantId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare price: string;

  @BelongsTo(() => RestaurantModel)
  declare restaurant: RestaurantModel;
}
