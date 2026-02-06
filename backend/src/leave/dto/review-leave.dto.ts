import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ReviewLeaveDto {
  @ApiProperty({ example: 'Approved for the mentioned dates', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
