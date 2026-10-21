/**
 * Lightweight in-memory IndexedDB polyfill for Vitest.
 *
 * The local `fake-indexeddb` installation is missing its compiled `build/esm`
 * output, so importing `fake-indexeddb/auto` fails to resolve. This polyfill
 * implements only the subset of the IndexedDB API used by Finance Pal's
 * receipt and audit stores:
 *
 * - open/deleteDatabase with onupgradeneeded
 * - createObjectStore/createIndex/index
 * - put/get/delete/clear/getAll/getAllKeys
 * - index.getAll and index.openCursor (next/prev)
 * - IDBKeyRange bound/lowerBound/upperBound/only
 *
 * It is intentionally small and not a full IndexedDB implementation.
 */

type Key = any;

interface StoredRecord {
  key: Key;
  value: any;
}

interface IndexDefinition {
  name: string;
  keyPath: string;
  unique: boolean;
}

function cloneValue<T>(value: T): T {
  try {
    return typeof structuredClone === "function" ? structuredClone(value) : value;
  } catch {
    return value;
  }
}

function compareKeys(a: Key, b: Key): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
      const comparison = compareKeys(a[i], b[i]);
      if (comparison !== 0) return comparison;
    }
    return a.length - b.length;
  }

  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

class FakeIDBKeyRange {
  readonly lower: Key;
  readonly upper: Key;
  readonly lowerOpen: boolean;
  readonly upperOpen: boolean;

  constructor(lower: Key, upper: Key, lowerOpen = false, upperOpen = false) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }

  static bound(lower: Key, upper: Key, lowerOpen = false, upperOpen = false) {
    return new FakeIDBKeyRange(lower, upper, lowerOpen, upperOpen);
  }

  static lowerBound(lower: Key, open = false) {
    return new FakeIDBKeyRange(lower, undefined, open, true);
  }

  static upperBound(upper: Key, open = false) {
    return new FakeIDBKeyRange(undefined, upper, true, open);
  }

  static only(value: Key) {
    return new FakeIDBKeyRange(value, value, false, false);
  }

  includes(key: Key): boolean {
    if (this.lower !== undefined) {
      const cmp = compareKeys(key, this.lower);
      if (cmp < 0 || (cmp === 0 && this.lowerOpen)) return false;
    }
    if (this.upper !== undefined) {
      const cmp = compareKeys(key, this.upper);
      if (cmp > 0 || (cmp === 0 && this.upperOpen)) return false;
    }
    return true;
  }
}

class FakeRequest<T = any> {
  result: T | undefined;
  error: any = null;
  readyState: "pending" | "done" = "pending";
  source: any = null;
  transaction: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

class FakeCursor {
  readonly value: any;
  readonly key: Key;
  readonly primaryKey: Key;
  readonly source: any;
  private readonly entries: StoredRecord[];
  private readonly indexKeys: Key[];
  private position: number;
  private readonly request: FakeRequest;
  private readonly transaction: FakeTransaction;

  constructor(
    entries: StoredRecord[],
    indexKeys: Key[],
    position: number,
    request: FakeRequest,
    transaction: FakeTransaction,
    source: any,
  ) {
    this.entries = entries;
    this.indexKeys = indexKeys;
    this.position = position;
    this.request = request;
    this.transaction = transaction;
    this.source = source;
    this.value = cloneValue(entries[position].value);
    this.key = indexKeys[position];
    this.primaryKey = entries[position].key;
  }

  continue(): void {
    this.position += 1;
    this.transaction._emitCursor(this.request, this.entries, this.indexKeys, this.position, this.source);
  }

  advance(count: number): void {
    this.position += Math.max(1, count);
    this.transaction._emitCursor(this.request, this.entries, this.indexKeys, this.position, this.source);
  }
}

class FakeIndex {
  readonly name: string;
  readonly keyPath: string;
  readonly unique: boolean;
  readonly objectStore: FakeObjectStore;

  constructor(objectStore: FakeObjectStore, definition: IndexDefinition) {
    this.objectStore = objectStore;
    this.name = definition.name;
    this.keyPath = definition.keyPath;
    this.unique = definition.unique;
  }

  private indexKey(record: StoredRecord): Key {
    return this.keyPath.split(".").reduce((value: any, part: string) => value?.[part], record.value);
  }

  private sortedRecords(range?: FakeIDBKeyRange, direction: "next" | "prev" = "next"): Array<{ key: Key; value: StoredRecord }> {
    const records = this.objectStore._allRecords()
      .map((record) => ({ key: this.indexKey(record), value: record }))
      .filter((entry) => !range || range.includes(entry.key))
      .sort((a, b) => compareKeys(a.key, b.key));
    return direction === "prev" ? records.reverse() : records;
  }

  getAll(range?: FakeIDBKeyRange): FakeRequest<any[]> {
    return this.objectStore._transaction._read(() =>
      this.sortedRecords(range).map((entry) => cloneValue(entry.value.value)),
    );
  }

  getAllKeys(range?: FakeIDBKeyRange): FakeRequest<Key[]> {
    return this.objectStore._transaction._read(() =>
      this.sortedRecords(range).map((entry) => entry.value.key),
    );
  }

  openCursor(range?: FakeIDBKeyRange | null, direction: "next" | "prev" = "next"): FakeRequest<FakeCursor | null> {
    const request = new FakeRequest<FakeCursor | null>();
    const entries = this.sortedRecords(range ?? undefined, direction).map((entry) => entry.value);
    const indexKeys = this.sortedRecords(range ?? undefined, direction).map((entry) => entry.key);
    this.objectStore._transaction._emitCursor(request, entries, indexKeys, 0, this);
    return request;
  }
}

class FakeObjectStore {
  readonly name: string;
  readonly keyPath: string | null;
  readonly indexNames: Set<string> = new Set();
  readonly _transaction: FakeTransaction;
  private readonly records = new Map<string, StoredRecord>();
  private readonly indexes = new Map<string, FakeIndex>();

  constructor(transaction: FakeTransaction, name: string, options?: { keyPath?: string }) {
    this._transaction = transaction;
    this.name = name;
    this.keyPath = options?.keyPath ?? null;
  }

  createIndex(name: string, keyPath: string, options?: { unique?: boolean }): FakeIndex {
    const definition: IndexDefinition = { name, keyPath, unique: options?.unique ?? false };
    const index = new FakeIndex(this, definition);
    this.indexes.set(name, index);
    this.indexNames.add(name);
    return index;
  }

  index(name: string): FakeIndex {
    const index = this.indexes.get(name);
    if (!index) throw new Error(`Index not found: ${name}`);
    return index;
  }

  _allRecords(): StoredRecord[] {
    return Array.from(this.records.values()).sort((a, b) => compareKeys(a.key, b.key));
  }

  private makeKey(value: any, explicitKey?: Key): Key {
    if (this.keyPath) {
      return this.keyPath.split(".").reduce((current: any, part: string) => current?.[part], value);
    }
    return explicitKey;
  }

  private keyId(key: Key): string {
    return `${typeof key}:${String(key)}`;
  }

  put(value: any, key?: Key): FakeRequest<Key> {
    return this._transaction._write<Key>(() => {
      const recordKey = this.makeKey(value, key);
      if (recordKey === undefined || recordKey === null) {
        throw new Error("Key is required for object store put");
      }
      this.records.set(this.keyId(recordKey), { key: recordKey, value: cloneValue(value) });
      return recordKey;
    });
  }

  add(value: any, key?: Key): FakeRequest<Key> {
    return this._transaction._write<Key>(() => {
      const recordKey = this.makeKey(value, key);
      if (recordKey === undefined || recordKey === null) {
        throw new Error("Key is required for object store add");
      }
      if (this.records.has(this.keyId(recordKey))) {
        throw new Error("ConstraintError: key already exists");
      }
      this.records.set(this.keyId(recordKey), { key: recordKey, value: cloneValue(value) });
      return recordKey;
    });
  }

  get(key: Key): FakeRequest<any> {
    return this._transaction._read(() => {
      const record = this.records.get(this.keyId(key));
      return record ? cloneValue(record.value) : undefined;
    });
  }

  delete(key: Key): FakeRequest<undefined> {
    return this._transaction._write<undefined>(() => {
      this.records.delete(this.keyId(key));
      return undefined;
    });
  }

  clear(): FakeRequest<undefined> {
    return this._transaction._write<undefined>(() => {
      this.records.clear();
      return undefined;
    });
  }

  getAll(): FakeRequest<any[]> {
    return this._transaction._read(() => this._allRecords().map((record) => cloneValue(record.value)));
  }

  getAllKeys(): FakeRequest<Key[]> {
    return this._transaction._read(() => this._allRecords().map((record) => record.key));
  }

  count(): FakeRequest<number> {
    return this._transaction._read(() => this.records.size);
  }

  openCursor(range?: FakeIDBKeyRange | null, direction: "next" | "prev" = "next"): FakeRequest<FakeCursor | null> {
    const request = new FakeRequest<FakeCursor | null>();
    const sorted = this._allRecords();
    const records = direction === "prev" ? [...sorted].reverse() : sorted;
    const keys = records.map((record) => record.key);
    this._transaction._emitCursor(
      request,
      records.filter((record) => !range || range.includes(record.key)),
      keys.filter((key) => !range || range.includes(key)),
      0,
      this,
    );
    return request;
  }
}

class FakeTransaction {
  readonly db: FakeDatabase;
  readonly mode: "readonly" | "readwrite";
  readonly objectStoreNames: Set<string>;
  error: any = null;
  oncomplete: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onabort: ((event: any) => void) | null = null;
  private pending = 0;
  private completed = false;

  constructor(db: FakeDatabase, storeNames: string | string[], mode: "readonly" | "readwrite" = "readonly") {
    this.db = db;
    this.mode = mode;
    this.objectStoreNames = new Set(Array.isArray(storeNames) ? storeNames : [storeNames]);
  }

  objectStore(name: string): FakeObjectStore {
    if (!this.objectStoreNames.has(name)) {
      throw new Error(`Object store not in transaction: ${name}`);
    }
    return this.db._getStore(this, name);
  }

  abort(): void {
    this.error = new Error("AbortError");
    this.onabort?.({ target: this });
  }

  _track<T>(request: FakeRequest<T>, operation: () => T): void {
    this.pending += 1;
    queueMicrotask(() => {
      try {
        request.result = operation();
        request.readyState = "done";
        request.onsuccess?.({ target: request, currentTarget: request });
      } catch (error) {
        request.error = error;
        request.readyState = "done";
        request.onerror?.({ target: request, currentTarget: request });
        this.error = error;
        this.onerror?.({ target: this });
      } finally {
        this.pending -= 1;
        this._maybeComplete();
      }
    });
  }

  _read<T>(operation: () => T): FakeRequest<T> {
    const request = new FakeRequest<T>();
    request.transaction = this;
    this._track(request, operation);
    return request;
  }

  _write<T>(operation: () => T): FakeRequest<T> {
    const request = new FakeRequest<T>();
    request.transaction = this;
    this._track(request, operation);
    return request;
  }

  _emitCursor(
    request: FakeRequest<FakeCursor | null>,
    entries: StoredRecord[],
    indexKeys: Key[],
    position: number,
    source: any,
  ): void {
    this.pending += 1;
    queueMicrotask(() => {
      if (position >= entries.length) {
        request.result = null;
        request.readyState = "done";
      } else {
        request.result = new FakeCursor(entries, indexKeys, position, request, this, source);
        request.readyState = "done";
      }
      request.onsuccess?.({ target: request, currentTarget: request });
      this.pending -= 1;
      this._maybeComplete();
    });
  }

  private _maybeComplete(): void {
    if (this.completed || this.pending > 0) return;
    queueMicrotask(() => {
      if (this.completed || this.pending > 0) return;
      this.completed = true;
      this.oncomplete?.({ target: this });
    });
  }
}

class FakeDatabase {
  readonly name: string;
  version: number;
  onversionchange: ((event: any) => void) | null = null;
  private readonly stores = new Map<string, FakeObjectStore>();
  private readonly storeOptions = new Map<string, { keyPath?: string }>();

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
  }

  get objectStoreNames(): { contains(name: string): boolean; length: number; [Symbol.iterator](): Iterator<string> } {
    const names = Array.from(this.stores.keys());
    return {
      contains: (name: string) => this.stores.has(name),
      length: names.length,
      [Symbol.iterator]: () => names[Symbol.iterator](),
    };
  }

  createObjectStore(name: string, options?: { keyPath?: string }): FakeObjectStore {
    if (this.stores.has(name)) throw new Error(`Object store already exists: ${name}`);
    this.storeOptions.set(name, options ?? {});
    // The store is bound to transactions later; bootstrap it with a throwaway transaction.
    const bootstrap = new FakeTransaction(this, name, "readwrite");
    const store = new FakeObjectStore(bootstrap, name, options);
    this.stores.set(name, store);
    return store;
  }

  _getStore(transaction: FakeTransaction, name: string): FakeObjectStore {
    const base = this.stores.get(name);
    if (!base) throw new Error(`Object store not found: ${name}`);
    const store = new FakeObjectStore(transaction, name, this.storeOptions.get(name));
    // Share the same records/indexes map by delegating to the base store's state.
    (store as any).records = (base as any).records;
    (store as any).indexes = (base as any).indexes;
    for (const indexName of base.indexNames) store.indexNames.add(indexName);
    return store;
  }

  transaction(storeNames: string | string[], mode: "readonly" | "readwrite" = "readonly"): FakeTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) {
      if (!this.stores.has(name)) throw new Error(`Object store not found: ${name}`);
    }
    return new FakeTransaction(this, names, mode);
  }

  close(): void {
    // no-op
  }
}

class FakeIDBFactory {
  private readonly databaseMap = new Map<string, FakeDatabase>();

  open(name: string, version?: number): FakeRequest<FakeDatabase> {
    const request = new FakeRequest<FakeDatabase>();
    queueMicrotask(() => {
      try {
        let db = this.databaseMap.get(name);
        const requestedVersion = version ?? db?.version ?? 1;

        if (db && requestedVersion < db.version) {
          throw new Error("VersionError: requested version is lower than current version");
        }

        let upgrade = false;
        if (!db) {
          db = new FakeDatabase(name, requestedVersion);
          this.databaseMap.set(name, db);
          upgrade = true;
        } else if (requestedVersion > db.version) {
          db.version = requestedVersion;
          upgrade = true;
        }

        request.result = db;
        if (upgrade) {
          request.onupgradeneeded?.({ target: request, currentTarget: request, oldVersion: 0, newVersion: requestedVersion });
        }
        request.readyState = "done";
        request.onsuccess?.({ target: request, currentTarget: request });
      } catch (error) {
        request.error = error;
        request.readyState = "done";
        request.onerror?.({ target: request, currentTarget: request });
      }
    });
    return request;
  }

  deleteDatabase(name: string): FakeRequest<undefined> {
    const request = new FakeRequest<undefined>();
    queueMicrotask(() => {
      this.databaseMap.delete(name);
      request.result = undefined;
      request.readyState = "done";
      request.onsuccess?.({ target: request, currentTarget: request });
    });
    return request;
  }

  databases(): Promise<Array<{ name: string; version: number }>> {
    return Promise.resolve(Array.from(this.databaseMap.values()).map((db) => ({ name: db.name, version: db.version })));
  }
}

if (!(globalThis as any).indexedDB) {
  Object.defineProperty(globalThis, "indexedDB", {
    value: new FakeIDBFactory(),
    writable: true,
    configurable: true,
  });
}

if (!(globalThis as any).IDBKeyRange) {
  Object.defineProperty(globalThis, "IDBKeyRange", {
    value: FakeIDBKeyRange,
    writable: true,
    configurable: true,
  });
}

export {};
