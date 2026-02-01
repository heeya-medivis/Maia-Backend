import { Controller, Get, Put, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("Users Admin")
@Controller("api/admin/users")
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Get all users (admin only)" })
  async getAllUsers() {
    const users = await this.usersService.findAll();

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.organization,
      role: user.role,
      isAdmin: user.isAdmin,
      lastLoginWeb: user.lastLoginWeb,
      lastLoginApp: user.lastLoginApp,
      createdDateTime: user.createdDateTime,
    }));
  }

  @Put(":id")
  @ApiOperation({ summary: "Update user (admin only)" })
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, {
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      organization: updateUserDto.organization,
      role: updateUserDto.role,
      isAdmin: updateUserDto.isAdmin,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.organization,
      role: user.role,
      isAdmin: user.isAdmin,
      lastLoginWeb: user.lastLoginWeb,
      lastLoginApp: user.lastLoginApp,
      createdDateTime: user.createdDateTime,
    };
  }
}
