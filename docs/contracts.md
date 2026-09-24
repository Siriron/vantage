# Vantage — Contract Reference

Contract: `contracts/vantage.py`. Pinned dependency: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.

## Write methods

| Method | Who calls it | What it does |
|---|---|---|
| `register_event(venue_name, event_date_label, event_start_unix, capacity_limit)` — payable | Organizer | Locks venue, date, capacity, and a bond (0.001–5 GEN) before the event happens. |
| `close_event(event_id)` | Organizer | Reclaims the remaining bond once the event has no open incident. |
| `open_incident(event_id, summary, evidence_deadline_seconds)` | Anyone | Opens one compliance check against a past event; sets the evidence-commit window (15 min – 7 days). |
| `expire_incident(incident_id)` | Anyone | Closes an incident as `unverifiable` if the full evidence + reveal window elapsed with no verified source. |
| `commit_evidence(incident_id, commitment)` — payable | Anyone | Commits `sha256(incident_id | submitter | family | url | salt)` with a small evidence bond, before the commit deadline. |
| `expire_unrevealed_evidence(evidence_id)` | Anyone | Returns an evidence bond to the organizer if a commitment was never revealed. |
| `reveal_evidence(evidence_id, source_family, source_url, salt)` | The original submitter | Reveals the committed source; must match the stored hash exactly. |
| `examine_source(evidence_id)` | Anyone | Triggers the first independent nondet round: fetches the source and judges event-identity, family match, and reported occupancy. |
| `resolve_incident(incident_id)` | Anyone | Triggers the second independent nondet round: adjudicates the incident from verified sources against the locked capacity, applies the graded-ladder outcome. |
| `claim()` | Anyone with a credited balance | Pull-based withdrawal of any credited GEN. |

## View methods

`get_event`, `get_incident`, `get_evidence`, `get_reputation(address)`, `get_credit(address)`, `get_stats()` — all return JSON via `json.dumps()`.

## Verdict-enum reachability trace

| Outcome | Reachable via |
|---|---|
| `no_breach` | `_ratio_to_outcome`, ratio ≤ 10000 bps |
| `mild_overage` | `_ratio_to_outcome`, ratio ≤ 11000 bps |
| `moderate_overage` | `_ratio_to_outcome`, ratio ≤ 13000 bps |
| `severe_overage` | `_ratio_to_outcome`, ratio > 13000 bps |
| `unverifiable` | `leader_fn`'s `resolvable: false` branch in `resolve_incident`, or `expire_incident` with zero verified evidence |

Every value is traced against a real `leader_fn` branch in the contract's own docstring before submission, per this project's confirmed rejection precedent (RetractionWatch).

## Nondet safety checklist (section 4, all ten items) — confirmed against the final file

1. `run_nondet_unsafe` called positionally in both `examine_source` and `resolve_incident`.
2. Both `validator_fn`s check `isinstance(leaders_res, gl.vm.Return)` first and read `.calldata`.
3. No `.send()` anywhere; settlement is `emit_transfer(value=...)` inside `claim()` only.
4. Every storage-backed field (`Event`, `Incident`, `Evidence` records) is `copy_to_memory()`'d before either `run_nondet_unsafe` call.
5. No class-body attribute carries a type annotation unless it's genuine per-instance storage; all constants are module-level.
6. `leader_fn`/`validator_fn` are nested functions in both nondet write methods; a real indentation-scoped scan confirms zero `self.` references in either body.
7. `verified_families` (an array-shaped field on the `Incident` dataclass) is a delimiter-joined `str`, never a `DynArray` on a nested dataclass.
8. Timestamps use the confirmed hand-rolled `_now_epoch_seconds()` parser throughout.
9. Every field the verdict depends on — `same_event`, `family_matches`, `occupancy_figure` (with a proportional tolerance band, since it's a continuous reading rather than a discrete LLM choice), `resolvable`, and the outcome itself — is independently re-derived and compared in the corresponding `validator_fn`.
10. The `reputation` and `credits` TreeMaps are keyed by lowercase hex address (`_addr_key`), applied identically at every write and read site.

## Tests

`tests/test_vantage.py` — 36 direct-mode tests executing the real contract under the pinned GenVM runner via `genlayer-test==0.29.2`. Covers every write method, every ladder outcome (parametrized), HTTP-error handling (the confirmed `.status`-vs-`.status_code` regression), prompt-injection wrapping, validator agreement and rejection (including ordinal-tolerance and wide-swing cases), bounded-exit paths, and storage-pickling safety (`check_pickling`).

Run with:
```bash
pip install "genlayer-test==0.29.2"
pytest tests -q -p no:cacheprovider
```

See `docs/deployment.md` for exactly what these tests do and do not prove.
