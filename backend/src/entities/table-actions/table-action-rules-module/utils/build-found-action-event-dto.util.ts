import { ActionEventsEntity } from '../../table-action-events-module/action-event.entity.js';
import { FoundActionEventDTO } from '../application/dto/found-action-rules-with-actions-and-events.dto.js';

export function buildActionEventDto(actionEvent: ActionEventsEntity): FoundActionEventDTO {
  return {
    id: actionEvent.id,
    event: actionEvent.event,
    title: actionEvent.title,
    icon: actionEvent.icon,
    require_confirmation: actionEvent.require_confirmation,
    created_at: actionEvent.created_at,
  };
}
