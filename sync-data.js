export const driveSyncDocumentVersion = 1;

function time(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function later(left, right) {
  return time(left) >= time(right) ? left : right;
}

function mergeTombstones(left = {}, right = {}) {
  const merged = { ...left };
  Object.entries(right).forEach(([id, deletedAt]) => {
    if (!merged[id] || time(deletedAt) > time(merged[id])) merged[id] = deletedAt;
  });
  return merged;
}

function mergeRecords(local, remote, identity, updatedAt, tombstones) {
  const records = new Map();
  [...remote, ...local].forEach((record) => {
    const id = identity(record);
    const existing = records.get(id);
    if (!existing || time(updatedAt(record)) >= time(updatedAt(existing))) records.set(id, record);
  });
  return [...records.entries()]
    .filter(([id, record]) => time(updatedAt(record)) > time(tombstones[id]))
    .map(([, record]) => record);
}

export function emptyDriveSyncMeta(updatedAt = new Date(0).toISOString()) {
  return {
    version: driveSyncDocumentVersion,
    updatedAt,
    tombstones: { vocabulary: {}, knownWords: {}, articles: {} },
  };
}

export function mergeDriveSyncDocuments(local, remote) {
  const vocabularyTombstones = mergeTombstones(
    local.meta.tombstones.vocabulary,
    remote.meta.tombstones.vocabulary,
  );
  const knownWordTombstones = mergeTombstones(
    local.meta.tombstones.knownWords,
    remote.meta.tombstones.knownWords,
  );
  const articleTombstones = mergeTombstones(
    local.meta.tombstones.articles,
    remote.meta.tombstones.articles,
  );

  return {
    version: driveSyncDocumentVersion,
    updatedAt: later(local.updatedAt, remote.updatedAt),
    vocabulary: mergeRecords(
      local.vocabulary,
      remote.vocabulary,
      (record) => record.id,
      (record) => record.lastReviewedAt || record.savedAt,
      vocabularyTombstones,
    ),
    knownWords: mergeRecords(
      local.knownWords,
      remote.knownWords,
      (word) => word.normalized,
      (word) => word.knownAt,
      knownWordTombstones,
    ),
    articles: mergeRecords(
      local.articles,
      remote.articles,
      (article) => article.id,
      (article) => article.savedAt,
      articleTombstones,
    ),
    meta: {
      version: driveSyncDocumentVersion,
      updatedAt: later(local.meta.updatedAt, remote.meta.updatedAt),
      tombstones: {
        vocabulary: vocabularyTombstones,
        knownWords: knownWordTombstones,
        articles: articleTombstones,
      },
    },
  };
}
