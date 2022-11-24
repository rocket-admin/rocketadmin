import { faker } from '@faker-js/faker';

export function getRandomTestTableName(): string {
  const testTableName = `${faker.random.words(1)}_${faker.random.words(1)}`;
  return testTableName;
}

export function getRandomConstraintName(): string {
  return `${faker.random.words(1)}_${faker.random.words(1)}_${faker.random.words(1)}`;
}
