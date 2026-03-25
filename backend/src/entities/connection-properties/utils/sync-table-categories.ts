import { Repository } from 'typeorm';
import { TableCategoriesEntity } from '../../table-categories/table-categories.entity.js';
import { ConnectionPropertiesEntity } from '../connection-properties.entity.js';

interface ICategoryInput {
	category_name: string;
	tables: Array<string>;
	category_color: string;
	category_id: string;
}

export async function syncTableCategories(
	inputCategories: Array<ICategoryInput>,
	existingCategories: Array<TableCategoriesEntity>,
	connectionProperties: ConnectionPropertiesEntity,
	tableCategoriesRepository: Repository<TableCategoriesEntity>,
): Promise<Array<TableCategoriesEntity>> {
	const result: Array<TableCategoriesEntity> = [];

	const categoriesToRemove = existingCategories.filter((existing) => {
		return !inputCategories.some((input) => input.category_id === existing.category_id);
	});
	if (categoriesToRemove.length > 0) {
		await tableCategoriesRepository.remove(categoriesToRemove);
	}

	const categoriesToCreate = inputCategories.filter((input) => {
		return !existingCategories.some((existing) => existing.category_id === input.category_id);
	});
	if (categoriesToCreate.length > 0) {
		const created = categoriesToCreate.map((category) => {
			const entity = tableCategoriesRepository.create({
				category_name: category.category_name,
				tables: category.tables,
				category_color: category.category_color,
				category_id: category.category_id,
			});
			entity.connection_properties = connectionProperties;
			return entity;
		});
		const saved = await tableCategoriesRepository.save(created);
		result.push(...saved);
	}

	const categoriesToUpdate = inputCategories.filter((input) => {
		return existingCategories.some((existing) => existing.category_id === input.category_id);
	});
	const updatedEntities = categoriesToUpdate
		.map((category) => {
			const entity = existingCategories.find((existing) => existing.category_id === category.category_id);
			if (entity) {
				entity.category_name = category.category_name;
				entity.category_color = category.category_color;
				entity.tables = category.tables;
			}
			return entity;
		})
		.filter((entity): entity is TableCategoriesEntity => !!entity);

	if (updatedEntities.length > 0) {
		const saved = await tableCategoriesRepository.save(updatedEntities);
		result.push(...saved);
	}

	return result;
}
