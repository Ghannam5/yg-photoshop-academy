import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, Public } from '../auth/decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@ApiTags('Course Reviews')
@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/reviews')
  @ApiOperation({ summary: 'Create a review for a course' })
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(user.id, courseId, dto);
  }

  @Public()
  @Get('courses/:courseId/reviews')
  @ApiOperation({ summary: 'List reviews for a course' })
  getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    return this.reviewService.getCourseReviews(courseId, page, pageSize);
  }

  @Public()
  @Get('courses/:courseId/rating')
  @ApiOperation({ summary: 'Get average rating for a course' })
  getCourseRating(@Param('courseId') courseId: string) {
    return this.reviewService.getCourseRating(courseId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('reviews/:id')
  @ApiOperation({ summary: 'Update your own review' })
  updateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.updateReview(user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete your own review' })
  deleteReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reviewService.deleteReview(user.id, id);
  }
}
