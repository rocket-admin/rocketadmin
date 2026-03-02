import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreatePanelPositionDs } from '../data-structures/create-panel-position.ds.js';
import { DeletePanelPositionDs } from '../data-structures/delete-panel-position.ds.js';
import { GeneratePanelPositionWithAiDs } from '../data-structures/generate-panel-position-with-ai.ds.js';
import { GenerateTableDashboardWithAiDs } from '../data-structures/generate-table-dashboard-with-ai.ds.js';
import { UpdatePanelPositionDs } from '../data-structures/update-panel-position.ds.js';
import { FoundPanelPositionDto } from '../dto/found-panel-position.dto.js';
import { GeneratedPanelWithPositionDto } from '../dto/generated-panel-with-position.dto.js';

export interface ICreatePanelPositionWidget {
	execute(inputData: CreatePanelPositionDs, inTransaction: InTransactionEnum): Promise<FoundPanelPositionDto>;
}

export interface IUpdatePanelPosition {
	execute(inputData: UpdatePanelPositionDs, inTransaction: InTransactionEnum): Promise<FoundPanelPositionDto>;
}

export interface IDeletePanelPosition {
	execute(inputData: DeletePanelPositionDs, inTransaction: InTransactionEnum): Promise<FoundPanelPositionDto>;
}

export interface IGeneratePanelPositionWithAi {
	execute(inputData: GeneratePanelPositionWithAiDs, inTransaction: InTransactionEnum): Promise<GeneratedPanelWithPositionDto>;
}

export interface IGenerateTableDashboardWithAi {
	execute(inputData: GenerateTableDashboardWithAiDs, inTransaction: InTransactionEnum): Promise<{ success: boolean }>;
}
