import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
}

export const CurrentSession = createParamDecorator(
  (data: keyof SessionInfo | undefined, ctx: ExecutionContext): SessionInfo | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session as SessionInfo;

    if (!session) {
      return null;
    }

    return data ? session[data] : session;
  },
);
