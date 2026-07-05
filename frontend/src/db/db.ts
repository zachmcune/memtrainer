import Dexie, { type Table } from 'dexie';
import type { AppSettings, CardStat, SessionRecord } from './types';

export class MnemonicaDB extends Dexie {
  sessions!: Table<SessionRecord, number>;
  cardStats!: Table<CardStat, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('mnemonica-trainer');
    this.version(1).stores({
      sessions: '++id, startedAt, finishedAt, mode',
      cardStats: 'id, mode, code, position',
      settings: 'id',
    });
  }
}

export const db = new MnemonicaDB();
