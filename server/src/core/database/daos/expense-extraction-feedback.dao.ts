import { Injectable } from '@nestjs/common';
import { ExpenseExtractionFeedbackEntity } from '@core/database/entities/expense-extraction-feedback.entity';
import { BaseDao } from '@core/database/base.dao';
import { ReposService } from '@core/database/repos.service';

@Injectable()
export class ExpenseExtractionFeedbackDao extends BaseDao<ExpenseExtractionFeedbackEntity> {
  constructor(repos: ReposService) {
    super(repos.expenseExtractionFeedback);
  }
}
