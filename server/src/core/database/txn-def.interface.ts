import type { EntityManager } from 'typeorm';

export interface TxnDef {
  inTxn: boolean;
  txn?: EntityManager;
}

export class WithTxnDef implements TxnDef {
  inTxn = true;

  constructor(public txn: EntityManager) {}
}

export class NoTxnDef implements TxnDef {
  inTxn = false;
}

export const NoTxn: NoTxnDef = new NoTxnDef();

export const WithTxn: (txn: EntityManager) => WithTxnDef = (txn: EntityManager) => new WithTxnDef(txn);

export const WithOptionalTxn: (txn?: EntityManager) => WithTxnDef | NoTxnDef = (txn?: EntityManager) => (txn ? WithTxn(txn) : NoTxn);
