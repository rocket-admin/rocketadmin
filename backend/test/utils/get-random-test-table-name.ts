import { faker } from '@faker-js/faker';

export function getRandomTestTableName(): string {
  const testTableName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
  return testTableName;
}

export function getRandomConstraintName(): string {
  return `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
}
