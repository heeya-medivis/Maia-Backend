import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import { DevicesRepository } from "../repositories/devices.repository";
import { SessionService } from "../services/session.service";
import { type AuthUser } from "../../../common";

class UpdateDeviceDto {
  name?: string;
}

@ApiTags("Devices")
@ApiBearerAuth()
@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(
    private readonly devicesRepository: DevicesRepository,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * GET /devices - List user's devices
   */
  @Get()
  @ApiOperation({ summary: "List all devices for current user" })
  async listDevices(@CurrentUser() user: AuthUser) {
    const userDevices = await this.devicesRepository.findNonRevokedByUserId(
      user.id,
    );

    return {
      devices: userDevices.map((d) => ({
        id: d.id,
        name: d.name,
        deviceType: d.deviceType,
        platform: d.platform,
        appVersion: d.appVersion,
        osVersion: d.osVersion,
        lastActiveAt: d.lastActiveAt,
        isActive: d.isActive,
        createdDateTime: d.createdDateTime,
        isCurrent: d.id === user.deviceId,
      })),
    };
  }

  /**
   * GET /devices/:id - Get device details
   */
  @Get(":id")
  @ApiOperation({ summary: "Get device details" })
  async getDevice(
    @CurrentUser() user: AuthUser,
    @Param("id") deviceId: string,
  ) {
    const device = await this.devicesRepository.findByIdAndUserId(
      deviceId,
      user.id,
    );

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    return {
      device: {
        id: device.id,
        name: device.name,
        deviceType: device.deviceType,
        platform: device.platform,
        appVersion: device.appVersion,
        osVersion: device.osVersion,
        lastActiveAt: device.lastActiveAt,
        isActive: device.isActive,
        createdDateTime: device.createdDateTime,
        isCurrent: device.id === user.deviceId,
      },
    };
  }

  /**
   * PATCH /devices/:id - Update device info
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update device info" })
  async updateDevice(
    @CurrentUser() user: AuthUser,
    @Param("id") deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    const device = await this.devicesRepository.findByIdAndUserId(
      deviceId,
      user.id,
    );

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    await this.devicesRepository.update(deviceId, {
      name: dto.name,
    });

    return {
      success: true,
      message: "Device updated",
    };
  }

  /**
   * DELETE /devices/:id - Revoke device
   */
  @Delete(":id")
  @ApiOperation({ summary: "Revoke device access" })
  async revokeDevice(
    @CurrentUser() user: AuthUser,
    @Param("id") deviceId: string,
  ) {
    // Can't revoke current device
    if (deviceId === user.deviceId) {
      throw new ForbiddenException(
        "Cannot revoke current device. Use logout instead.",
      );
    }

    const device = await this.devicesRepository.findByIdAndUserId(
      deviceId,
      user.id,
    );

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Revoke all sessions for this device
    await this.sessionService.revokeDeviceSessions(deviceId);

    // Mark device as revoked
    await this.devicesRepository.revoke(deviceId);

    return {
      success: true,
      message: "Device revoked",
    };
  }
}
