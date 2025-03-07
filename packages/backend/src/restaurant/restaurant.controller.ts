import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RestaurantResponseDto } from './restaurant.dto';
import { RestaurantService } from './restaurant.service';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve restaurant details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Restaurant details retrieved successfully.',
    type: RestaurantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async getRestaurant(@Param('id') id: string) {
    return this.restaurantService.getRestaurant(id);
  }
}
