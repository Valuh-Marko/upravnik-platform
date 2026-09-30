import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { AccessService } from '../auth/access/access.service';
import type { AuthUser } from '../auth/access/auth-user';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

interface SocketData {
  user?: AuthUser;
  tokenExp?: number;
  expiryTimer?: NodeJS.Timeout;
}
type ChatSocket = Socket<any, any, any, SocketData>;

// Every socket also joins its own `user:<id>` room so the HTTP side can reach all of
// a user's sockets (leave a building room on deactivation, disconnect on account disable).
const userRoom = (userId: string) => `user:${userId}`;

// CORS origins come from CORS_ORIGIN via the IoAdapter set up in app.setup.ts.
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Namespace;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private access: AccessService,
  ) {}

  // Authenticates in the handshake, so the connection is only accepted once the
  // user is known (a bad token gets `connect_error`). Same checks as the HTTP
  // JwtStrategy: valid signature, active account, not issued before the last password change.
  afterInit(server: Namespace) {
    server.use((client: ChatSocket, next) => {
      this.authenticate(client).then(
        () => next(),
        () => next(new Error('Unauthorized')),
      );
    });
  }

  // The socket is dropped when the token expires.
  async handleConnection(client: ChatSocket) {
    const { user, tokenExp } = client.data;
    if (!user) return client.disconnect(true);
    await client.join(userRoom(user.id));
    if (tokenExp) {
      client.data.expiryTimer = setTimeout(
        () => client.disconnect(true),
        tokenExp * 1000 - Date.now(),
      );
    }
  }

  handleDisconnect(client: ChatSocket) {
    clearTimeout(client.data.expiryTimer);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() buildingId: string,
  ) {
    if (!isUUID(buildingId)) throw new WsException('Invalid buildingId');
    await this.assertMember(client, buildingId);
    await client.join(buildingId);
    return { joined: buildingId };
  }

  @SubscribeMessage('message')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new WsException({
          status: 'error',
          message: errors.flatMap((e) => Object.values(e.constraints ?? {})),
        }),
    }),
  )
  async handleMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const user = await this.assertMember(client, data.buildingId);
    const message = await this.chatService.saveMessage(
      data.buildingId,
      user.id,
      data.body,
    );
    this.server.to(data.buildingId).emit('message', message);
  }

  // Called when a building membership is deactivated.
  leaveBuilding(userId: string, buildingId: string) {
    this.server.in(userRoom(userId)).socketsLeave(buildingId);
  }

  // Called when a whole account is disabled.
  disconnectUser(userId: string) {
    this.server.in(userRoom(userId)).disconnectSockets(true);
  }

  private async authenticate(client: ChatSocket) {
    const token = (client.handshake.auth as { token?: unknown }).token;
    if (typeof token !== 'string') throw new Error('No token');
    const payload = this.jwtService.verify<JwtPayload>(token);
    const user = await this.access.loadUser(payload.sub, payload.iat);
    if (!user) throw new Error('Inactive or revoked');
    client.data.user = user;
    client.data.tokenExp = payload.exp;
  }

  // Membership is checked on every event, not just on join, so a revoked member
  // can't keep posting from an already-open socket.
  private async assertMember(
    client: ChatSocket,
    buildingId: string,
  ): Promise<AuthUser> {
    const { user } = client.data;
    if (!user) throw new WsException('Unauthorized');
    const role = await this.access.resolveBuildingRole(user, buildingId);
    if (!role) throw new WsException('Forbidden');
    return user;
  }
}
