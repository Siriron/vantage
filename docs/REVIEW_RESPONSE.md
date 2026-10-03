# Vantage — response to steward review (Sep 27, 2026)

The steward asked for five things plus focused tests. Each row names the mechanism in `contracts/vantage.py` and the tests in `tests/test_vantage.py` that prove it. Run them with `pytest tests -q -p no:cacheprovider` (88 pass).

| Steward request | Mechanism | Tests |
|---|---|---|
| Keep the organizer's bond locked through the event and a defined challenge window | `close_event` rejects until `event_start + CHALLENGE_WINDOW_SECONDS` (7 days) and while an incident is open. `open_incident` only accepts filings inside that same window. | `test_close_event_blocked_until_challenge_window_ends`, `test_close_event_after_window_returns_exact_bond`, `test_close_event_blocked_by_open_incident`, `test_incident_cannot_be_filed_after_challenge_window` |
| Authenticate accepted evidence sources | At `reveal_evidence`, `_authenticate_source` runs deterministically before any model sees the URL: `SAFETY_AUTHORITY` must be a government domain (`gov.evil.com` fails); `VENUE_CERTIFICATE` / `TICKETING_PLATFORM` must be on the host the organizer locked at registration; IP literals, localhost, ports and credentials are rejected. The unauthenticable `INDEPENDENT_PRESS` family was removed. | `test_safety_authority_must_be_a_government_domain`, `test_government_domains_are_accepted`, `test_ticketing_source_must_be_the_locked_ticketing_host`, `test_venue_source_must_be_the_locked_venue_host`, `test_locked_host_and_its_subdomains_are_accepted`, `test_ip_local_port_and_credential_urls_rejected`, `test_press_family_no_longer_exists` |
| Deduplicate accepted evidence | A canonical key (lowercased host and path; fragment, query and trailing slash dropped) per incident is checked and set at reveal. | `test_same_source_cannot_be_accepted_twice_for_one_incident`, `test_query_string_variants_are_the_same_source`, `test_same_source_is_allowed_on_a_different_incident` |
| Require validator agreement on the financially meaningful outcome | `_OUTCOME_TOLERANCE_RUNGS = 0`: leader and validator derive the outcome from their own figure via `_ratio_to_outcome` and must match exactly. Variance is absorbed one stage earlier by the proportional tolerance on each source's figure. | `test_validator_requires_exact_outcome_agreement` (3 adjacent-rung cases), `test_incident_validator_rejects_even_one_adjacent_rung`, `test_validator_accepts_same_bucket_with_different_raw_figure`, `test_incident_validator_rejects_wide_ladder_swing` |
| Prevent self-filed incidents from farming reputation | The organizer cannot file (`open_incident`) or submit evidence (`commit_evidence`) on their own event; `no_breach` carries +0 reputation so no wallet has a positive-reputation path; a filing bond makes spam filings cost money (forfeited to the organizer on adjudicated `no_breach`, refunded when upheld or unprovable). | `test_organizer_cannot_file_incident_on_own_event`, `test_organizer_cannot_submit_evidence_on_own_event`, `test_no_breach_never_raises_reputation`, `test_filing_bond_out_of_range_rejected`, `test_filing_bond_refunded_when_breach_upheld`, `test_filing_bond_forfeited_to_organizer_on_no_breach`, `test_filing_bond_refunded_when_unverifiable`, `test_filing_bond_refunded_when_incident_expires` |

## Found by red-teaming v2 before resubmission (each had a failing test first)

| Hole | Fix | Tests |
|---|---|---|
| The adjudicator could return a figure no verified source reported, and with zero figures could invent one | figure must lie in the verified range (leader raises, validator rejects); no figures resolves `unverifiable` without calling the model | `test_resolve_rejects_a_figure_outside_the_verified_range`, `test_validator_rejects_a_leader_figure_outside_the_verified_range`, `test_verified_sources_without_any_figure_resolve_unverifiable_without_the_model` |
| A complainant could resolve before another party's revealed source was examined | `resolve_incident` and `expire_incident` refuse while any revealed source is unexamined | `test_resolve_blocked_while_revealed_evidence_is_unexamined`, `test_expire_blocked_while_revealed_evidence_is_unexamined` |
| An organizer puppet on the locked host could force `unverifiable` and escape a slash | government figures outrank organizer-host figures | `test_authority_figure_outranks_an_organizer_host_figure`, `test_organizer_host_figures_are_used_when_no_authority_source_exists` |
| `https://evil.com\.gov/x` passed the government-domain check (browsers read the backslash as a slash) | backslash, whitespace, non-ASCII and percent-encoding in the host are rejected | `test_ambiguous_host_characters_are_rejected` (4 cases) |
| `?x=1` and `?x=2` of one page counted as two sources | query string dropped from the dedupe key | `test_query_string_variants_are_the_same_source` |
| Unreachable host behaviour was untested | covered: fail-closed, no slash, filing bond refunded | `test_unreachable_host_is_a_failure_marker_not_evidence` |

## Found while auditing, not requested

The v1 "protocol share" of a slash was credited back to the organizer, so a breach cost them only 70% of the slashed amount. It now goes to a separate pool that only the treasury can withdraw. Tests: `test_protocol_share_never_returns_to_organizer`, `test_only_treasury_can_claim_protocol_pool`, `test_empty_protocol_pool_cannot_be_claimed`.

The frontend previously decoded a write's return value from the receipt, which failed on a live run. The contract now records each wallet's last event and evidence id (`get_last_event`, `get_last_evidence`), keyed by wallet rather than by a global counter. Tests: `test_last_event_is_tracked_per_creator`, `test_last_evidence_is_tracked_per_submitter_and_incident`.

## What is still not proven

- All model responses in the tests are mocked; no real model has read a real government or ticketing page.
- v2 has not been deployed or exercised live yet.
- Host authentication proves a source comes from a government domain or a host the organizer committed to before any dispute. It does not prove the page's content is true. Where no government source exists, adjudication rests on organizer-published data alone; where one exists, it outranks organizer-host data.
- Exact outcome agreement is stricter than v1. If live runs show frequent leader rotation near rung boundaries, the figure tolerance in `examine_source` is the knob to tune.
