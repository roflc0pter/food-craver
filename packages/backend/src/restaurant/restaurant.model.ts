import {
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { MenuFileModel } from './menu-file/menu-file.model';
import { OfferingModel } from './offering/offering.model';

@Table({ tableName: 'restaurants' })
export class RestaurantModel extends Model {
  @PrimaryKey
  @Column({ type: DataType.INTEGER, autoIncrement: true })
  declare restaurantId: number;

  @Column({ type: DataType.STRING })
  declare name?: string;

  @Column({ type: DataType.STRING })
  declare url?: string;

  @HasMany(() => OfferingModel)
  declare offerings: OfferingModel[];

  @HasMany(() => MenuFileModel)
  declare files: MenuFileModel[];
}
