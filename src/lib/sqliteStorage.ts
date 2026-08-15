/**
 * @deprecated Use `src/lib/indexedDbStorage.ts` instead.
 * 
 * This re-export layer is preserved for legacy backward compatibility.
 * Primary IndexedDB implementation is located in `indexedDbStorage.ts`.
 * The `sqlite` namespace is reserved for the upcoming native Rust Core SQLite engine.
 */
export * from './indexedDbStorage';
