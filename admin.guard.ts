import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

// Assumes JwtAuthGuard already ran and attached req.user from the token payload.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user || req.user.role !== 'admin') {
      throw new UnauthorizedException('Admin access only');
    }
    return true;
  }
}
