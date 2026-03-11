import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { createKafkaConfig } from '../config/kafka.config';

/**
 * Consumes identity domain events from Kafka.
 * Listens for identity.user.created and identity.organization.created
 * to pre-seed default authorization structures.
 */
@Injectable()
export class EventConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventConsumerService.name);
  private consumer!: Consumer;
  private kafka!: Kafka;

  /** Topics to subscribe to */
  private readonly TOPICS = [
    'identity-user-created',
    'identity-organization-created',
  ];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = createKafkaConfig(this.configService);
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
    this.consumer = this.kafka.consumer({ groupId: kafkaConfig.groupId });

    try {
      await this.consumer.connect();
      for (const topic of this.TOPICS) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });
      this.logger.log(`Kafka consumer subscribed to topics: ${this.TOPICS.join(', ')}`);
    } catch (error) {
      this.logger.warn('Kafka consumer connection failed — events will not be consumed', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.consumer?.disconnect();
    } catch {
      // swallow on shutdown
    }
  }

  private async handleMessage(messagePayload: EachMessagePayload): Promise<void> {
    const { topic, message } = messagePayload;
    const value = message.value?.toString();
    if (!value) return;

    try {
      const envelope = JSON.parse(value);
      this.logger.debug(`Received event on topic ${topic}: ${envelope.eventType}`);

      switch (envelope.eventType) {
        case 'identity.user.created':
          await this.handleUserCreated(envelope.payload);
          break;
        case 'identity.organization.created':
          await this.handleOrganizationCreated(envelope.payload);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${envelope.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process message on topic ${topic}`, error);
    }
  }

  /**
   * When a new user is created, assign them the default 'member' role
   * in their organization (if it exists).
   */
  private async handleUserCreated(payload: {
    userHashId: string;
    organizationHashId: string;
  }): Promise<void> {
    this.logger.log(
      `User created: ${payload.userHashId} in org ${payload.organizationHashId}. ` +
        `TODO: Auto-assign default member role.`,
    );
    // TODO: Inject UserRolesService and auto-assign default role
    // This will be wired once the circular dependency is resolved via forwardRef or event bus
  }

  /**
   * When a new organization is created, seed default system roles
   * (admin, member, viewer) for that organization.
   */
  private async handleOrganizationCreated(payload: {
    organizationHashId: string;
  }): Promise<void> {
    this.logger.log(
      `Organization created: ${payload.organizationHashId}. ` +
        `TODO: Seed default system roles.`,
    );
    // TODO: Inject RolesService and create default system roles
  }
}
