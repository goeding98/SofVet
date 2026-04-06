import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// localStorage key → Supabase table name
const TABLE_MAP = {
  clients:                 'clients',
  patients:                'patients',
  appointments:            'appointments',
  clinicalHistory:         'clinical_history',
  consultations:           'consultations',
  signedDocuments:         'signed_documents',
  vaccines:                'vaccines',
  grooming:                'grooming',
  hospitalization:         'hospitalization',
  guardianship:            'guardianship',
  remissions:              'remissions',
  eps:                     'eps',
  imaging:                 'imaging',
  formulas_medicas:        'formulas_medicas',
  procedimientos:          'procedimientos',
  laboratorios:            'laboratorios',
  hospitalization_reports: 'hospitalization_reports',
  laboratorios_pedidos:    'laboratorios_pedidos',
};

// ── Module-level cache (survives navigation, shared across all components) ──
const cache      = {};   // key → data array
const pending    = {};   // key → Promise (prevents duplicate fetches)
const subscribers = {};  // key → Set of setState functions

function notify(key, data) {
  subscribers[key]?.forEach(fn => fn(data));
}

async function fetchAll(table) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error(`[useStore] fetch ${table}:`, error.message); return null; } // null = error, don't cache
    if (!data || data.length === 0) break;
    all = [...all, ...data];
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function ensureLoaded(key, table, setItems, setLoading) {
  // Already cached — serve immediately (undefined = not yet fetched, [] = valid empty result)
  if (cache[key] !== undefined) {
    setItems(cache[key]);
    setLoading(false);
    return;
  }

  setLoading(true);

  // Already fetching — just subscribe
  if (pending[key]) {
    pending[key].then(data => {
      setItems(data);
      setLoading(false);
    });
    return;
  }

  // First fetch for this table
  pending[key] = fetchAll(table).then(data => {
    // Only cache if fetch succeeded (no error path sets data to null)
    if (data !== null) cache[key] = data;
    delete pending[key];
    notify(key, data ?? []);
    return data ?? [];
  });

  pending[key].then(data => {
    setItems(data);
    setLoading(false);
  });
}

// ── Public hook ───────────────────────────────────────────────────────────────
export function useStore(key) {
  const table = TABLE_MAP[key];

  const [items,   setItems]   = useState(() => cache[key] || []);
  const [loading, setLoading] = useState(!cache[key]);

  // Subscribe this component to cache updates
  useEffect(() => {
    if (!table) { setLoading(false); return; }

    if (!subscribers[key]) subscribers[key] = new Set();
    subscribers[key].add(setItems);

    ensureLoaded(key, table, setItems, setLoading);

    return () => {
      subscribers[key]?.delete(setItems);
    };
  }, [key, table]);

  // ── Optimistic add ────────────────────────────────────────────────────────
  const add = useCallback(async (item, options = {}) => {
    if (!table) return null;
    const { onError } = options;
    const tempId = -(Date.now());
    const { id: _discard, ...rest } = item;
    const optimistic = [...(cache[key] || []), { ...rest, id: tempId }];
    cache[key] = optimistic;
    notify(key, optimistic);

    const { data, error } = await supabase
      .from(table)
      .insert(rest)
      .select()
      .single();

    if (error) {
      console.error(`[useStore] add ${table}:`, error.message);
      onError?.(error.message);
      const rolled = (cache[key] || []).filter(i => i.id !== tempId);
      cache[key] = rolled;
      notify(key, rolled);
      return null;
    }
    const confirmed = (cache[key] || []).map(i => i.id === tempId ? data : i);
    cache[key] = confirmed;
    notify(key, confirmed);
    return data;
  }, [key, table]);

  // ── Optimistic edit ───────────────────────────────────────────────────────
  const edit = useCallback(async (id, changes) => {
    if (!table) return;
    const prev = cache[key] || [];
    const optimistic = prev.map(i => i.id === id ? { ...i, ...changes } : i);
    cache[key] = optimistic;
    notify(key, optimistic);

    const { id: _discard, ...rest } = changes;
    const { error } = await supabase
      .from(table)
      .update(rest)
      .eq('id', id);

    if (error) {
      console.error(`[useStore] edit ${table}:`, error.message);
      // Reload this table from Supabase to restore correct state
      fetchAll(table).then(data => {
        cache[key] = data;
        notify(key, data);
      });
    }
  }, [key, table]);

  // ── Optimistic remove ─────────────────────────────────────────────────────
  const remove = useCallback(async (id) => {
    if (!table) return;
    const prev = cache[key] || [];
    const optimistic = prev.filter(i => i.id !== id);
    cache[key] = optimistic;
    notify(key, optimistic);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[useStore] remove ${table}:`, error.message);
      fetchAll(table).then(data => {
        cache[key] = data;
        notify(key, data);
      });
    }
  }, [key, table]);

  // ── Force refresh (manual reload from Supabase) ───────────────────────────
  const refresh = useCallback(async () => {
    if (!table) return;
    delete cache[key];
    const data = await fetchAll(table);
    cache[key] = data;
    notify(key, data);
  }, [key, table]);

  return { items, add, edit, remove, loading, refresh };
}
