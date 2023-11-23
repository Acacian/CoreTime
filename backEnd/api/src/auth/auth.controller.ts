import {
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GithubService } from './github/github.service';
import { GoogleService } from './google/google.service';
import { UsersService } from '../users/users.service';
import { UserInfoDto } from '../users/dto/userInfo.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  private logger = new Logger(AuthController.name);
  constructor(
    private githubService: GithubService,
    private googleService: GoogleService,
    private authService: AuthService,
    private userService: UsersService,
  ) {}

  @Get('github')
  async githubProxy(
    @Res() res: Response,
    @Req() req: Request,
    @Query('next') next: string,
    @Query('dev') dev: boolean,
  ) {
    req.session['returnTo'] = dev
      ? `http://${path.join('localhost:3000', next)}`
      : `https://${path.join('algoitni.site', next)}`;
    req.session.save((err) => {
      if (err) this.logger.log(err);
    });
    const redirectUrl = this.githubService.getAuthUrl();
    return res.redirect(redirectUrl);
  }

  @Get('github-callback')
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code: string,
  ) {
    const accessToken = await this.githubService.getGithubAccessToken(code);
    const user = await this.githubService.getUserInfo(accessToken);
    let findUser = await this.userService.findUser(user);
    if (findUser === null) {
      await this.userService.addUser(user, 'github');
      findUser = await this.userService.findUser(user);
    }
    if (findUser.oauth !== 'github') {
      return { message: '다른 서비스로 가입한 내역이 있습니다.' }; // TODO: set StatusCode
    }

    const loginUser = new UserInfoDto();
    loginUser.id = findUser.id;
    loginUser.name = findUser.name;

    await this.authService.login(loginUser, res);
    const returnTo = req.session['returnTo'];

    delete req.session['returnTo'];
    req.session.save((err) => {
      if (err) this.logger.log(err);
    });

    return res.redirect(returnTo);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res() res: Response, @Req() req: Request) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    this.authService.logout(req.user);
    return res.json({ message: 'Logout success' });
  }
}
