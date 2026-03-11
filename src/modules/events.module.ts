import { Module, Global } from '@nestjs/common';
import { EventPublisherService } from '../events/event-publisher.service';
import { EventConsumerService } from '../events/event-consumer.service';

@Global()
@Module({
  providers: [EventPublisherService, EventConsumerService],
  exports: [EventPublisherService],
})
export class EventsModule {}
