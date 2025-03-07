import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { RestaurantModel } from '../restaurant.model';

@Table({ tableName: 'menu_file', timestamps: true })
export class MenuFileModel extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare menuFileId: string;

  @ForeignKey(() => RestaurantModel)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare restaurantId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare filePath: string;

  @BelongsTo(() => RestaurantModel)
  declare restaurant: RestaurantModel;
}
