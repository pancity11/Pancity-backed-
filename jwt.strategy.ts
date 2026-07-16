import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-this-to-a-long-random-secret',
    });
  }

  // Whatever we return here becomes req.user in controllers.
  async validate(payload: any) {
    return {
      sub: payload.sub,
      role: payload.role, // 'user' | 'admin'
      accountType: payload.accountType,
    };
  }
}
