import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() buildingId: string) {
    const user = client.data.user;
    if (!user?.sub) return;

    try {
      await this.chatService.assertMember(buildingId, user.sub, user.systemRole);
    } catch {
      return;
    }

    client.join(buildingId);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { buildingId: string; body: string },
  ) {
    const user = client.data.user;
    if (!user?.sub) return;

    try {
      await this.chatService.assertMember(data.buildingId, user.sub, user.systemRole);
    } catch {
      return;
    }

    const message = await this.chatService.saveMessage(data.buildingId, user.sub, data.body);
    this.server.to(data.buildingId).emit('message', message);
  }
}
