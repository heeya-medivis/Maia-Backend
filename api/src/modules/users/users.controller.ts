import { Controller, Get, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../../database/schema";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdDateTime,
      },
    };
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.update(
      user.id,
      updateProfileDto,
    );
    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        organization: updatedUser.organization,
        role: updatedUser.role,
        isAdmin: updatedUser.isAdmin,
        createdAt: updatedUser.createdDateTime,
      },
    };
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user by ID" })
  async getUserById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdDateTime,
      },
    };
  }
}
