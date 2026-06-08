import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { MerchantAliasEntity } from '@core/database/entities/merchant-alias.entity';
import { ReposService } from '@core/database/repos.service';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';

@Injectable()
export class MerchantAliasesDao extends BaseDao<MerchantAliasEntity> {
  constructor(repos: ReposService) {
    super(repos.merchantAlias);
  }

  findBestMatch(txnDef: TxnDef = NoTxn, merchantTaxId?: string | null, normalizedAliasName?: string | null): Promise<MerchantAliasEntity | null> {
    const qb = this.repositoryWithTxnDef(txnDef).createQueryBuilder('alias');

    if (merchantTaxId && normalizedAliasName) {
      qb.where('alias.merchantTaxId = :merchantTaxId', { merchantTaxId }).orWhere('alias.normalizedAliasName = :normalizedAliasName', {
        normalizedAliasName,
      });
    } else if (merchantTaxId) {
      qb.where('alias.merchantTaxId = :merchantTaxId', { merchantTaxId });
    } else if (normalizedAliasName) {
      qb.where('alias.normalizedAliasName = :normalizedAliasName', { normalizedAliasName });
    } else {
      return Promise.resolve(null);
    }

    return qb.orderBy('alias.hitCount', 'DESC').addOrderBy('alias.updatedAt', 'DESC').getOne();
  }

  async upsertAlias(
    txnDef: TxnDef = NoTxn,
    data: {
      merchantTaxId?: string | null;
      aliasName: string;
      normalizedAliasName: string;
      canonicalName: string;
      source?: string;
    },
  ): Promise<MerchantAliasEntity> {
    const existing = await this.findBestMatch(txnDef, data.merchantTaxId, data.normalizedAliasName);
    if (existing) {
      return this.updateByPk(txnDef, existing.id, {
        merchantTaxId: data.merchantTaxId ?? existing.merchantTaxId,
        aliasName: data.aliasName,
        normalizedAliasName: data.normalizedAliasName,
        canonicalName: data.canonicalName,
        source: data.source ?? existing.source,
        hitCount: existing.hitCount + 1,
      });
    }

    return this.create(txnDef, {
      merchantTaxId: data.merchantTaxId ?? null,
      aliasName: data.aliasName,
      normalizedAliasName: data.normalizedAliasName,
      canonicalName: data.canonicalName,
      source: data.source ?? 'manual_correction',
    });
  }
}
