import DockerNames from 'docker-names';
import { nanoid } from 'nanoid';

export function generateCompanyName(): string {
  return `${DockerNames.getRandomName()}_${nanoid(5)}`;
}
