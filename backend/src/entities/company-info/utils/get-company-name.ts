import DockerNames from 'docker-names';
import { nanoid } from 'nanoid';

export function getCompanyName(): string {
  return `${DockerNames.getRandomName()}_${nanoid(5)}`;
}
