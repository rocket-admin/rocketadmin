import { FoundActionEventDTO } from '../../table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { ActionEventsEntity } from '../action-event.entity.js';

export function buildFoundActionEventDTO(actionEvent: ActionEventsEntity): FoundActionEventDTO {
  return {
    id: actionEvent.id,
    event: actionEvent.event,
    title: actionEvent.title,
    icon: actionEvent.icon,
    require_confirmation: actionEvent.require_confirmation,
    created_at: actionEvent.created_at,
  };
}
