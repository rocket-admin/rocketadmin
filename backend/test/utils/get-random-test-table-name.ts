import { faker } from '@faker-js/faker';
import { nanoid } from 'nanoid';

export function getRandomTestTableName(): string {
  const testTableName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}_${nanoid(5)}`;
  return testTableName;
}

export function getRandomConstraintName(): string {
  return `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}_${nanoid(5)}`;
}
