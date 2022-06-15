import AbstractUseCase from '../../../common/abstract-use.case';
import { CreateTableWidgetsDs } from '../application/data-sctructures/create-table-widgets.ds';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds';
import { ICreateUpdateDeleteTableWidgets } from './table-widgets-use-cases.interface';
import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { validateCreateWidgetsDs } from '../utils/validate-create-widgets-ds';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { toPrettyErrorsMsg } from '../../../helpers';
import { buildEmptyTableSettingsWithEmptyWidgets } from '../../table-settings/utils/build-empty-table-settings';
import { buildNewTableWidgetEntity } from '../utils/build-new-table-widget-entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { buildFoundTableWidgetDs } from '../utils/build-found-table-widget-ds';
import { buildNewTableSettingsEntity } from '../../table-settings/utils/build-new-table-settings-entity';

@Injectable({ scope: Scope.REQUEST })
export class CreateUpdateDeleteTableWidgetsUseCase
  extends AbstractUseCase<CreateTableWidgetsDs, Array<FoundTableWidgetsDs>>
  implements ICreateUpdateDeleteTableWidgets
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableWidgetsDs): Promise<Array<FoundTableWidgetsDs>> {
    const { connectionId, masterPwd, tableName, userId, widgets } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    const errors: Array<string> = await validateCreateWidgetsDs(widgets, userId, foundConnection, tableName, null);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let tableSettingToUpdate = await this._dbContext.tableSettingsRepository.findTableSettingsWithTableWidgets(
      connectionId,
      tableName,
    );

    if (!tableSettingToUpdate) {
      const emptyTableSettingsDs = buildEmptyTableSettingsWithEmptyWidgets(connectionId, tableName, userId);
      const newTableSettings = buildNewTableSettingsEntity(emptyTableSettingsDs, foundConnection);
      tableSettingToUpdate = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(newTableSettings);
    }
    const foundTableWidgets = await this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName);

    for (const widget of widgets) {
      const availableWidgetIndex = foundTableWidgets.findIndex((w) => {
        return widget.field_name === w.field_name;
      });
      if (availableWidgetIndex >= 0) {
        const updatedWidget = Object.assign(foundTableWidgets[availableWidgetIndex], widget);
        await this._dbContext.tableWidgetsRepository.saveNewOrUpdatedTableWidget(updatedWidget);
        const widgetIndexInTableSettings = tableSettingToUpdate.table_widgets.findIndex((w) => {
          return w.field_name === updatedWidget.field_name;
        });
        tableSettingToUpdate.table_widgets[widgetIndexInTableSettings] = updatedWidget;
      } else {
        const newTableWidget = buildNewTableWidgetEntity(widget);
        const createdTableWidget = await this._dbContext.tableWidgetsRepository.saveNewOrUpdatedTableWidget(
          newTableWidget,
        );
        tableSettingToUpdate.table_widgets.push(createdTableWidget);
      }
    }

    for (const foundTableWidget of foundTableWidgets) {
      const findWidgetIndex = widgets.findIndex((widget) => {
        return widget.field_name === foundTableWidget.field_name;
      });
      if (findWidgetIndex < 0) {
        const widgetIndexInTableSettings = tableSettingToUpdate.table_widgets.findIndex((widget) => {
          return widget.field_name === foundTableWidget.field_name;
        });
        await this._dbContext.tableWidgetsRepository.removeTableWidget(foundTableWidget);
        tableSettingToUpdate.table_widgets.splice(widgetIndexInTableSettings, 1);
      }
    }

    const savedSettings: TableSettingsEntity = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(
      tableSettingToUpdate,
    );
    return savedSettings.table_widgets.map((widget) => {
      return buildFoundTableWidgetDs(widget);
    });
  }
}
