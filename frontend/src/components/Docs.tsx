import { CONTRACT_ADDRESS, EXPLORER_ADDRESS_URL } from '../config/chains';

export function Docs() {
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 720 }}>
      <p className="label">DOCUMENTATION</p>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>How Vantage works</h1>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Overview</h2>
        <p>
          Vantage lets an event organizer lock a maximum occupancy limit and post a compliance bond before
          tickets go on sale. If overcrowding is alleged after the event, anyone can open a compliance check
          citing a specific evidence source. Evidence is submitted through commit-reveal so submitters can't
          copy or react to each other's sources. Two independent GenLayer consensus rounds — first per-source
          examination, then incident-level adjudication — decide whether the event breached its locked
          capacity, and by how much.
        </p>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Why this needs consensus</h2>
        <p>
          The organizer benefits from a false "no breach" verdict — it keeps the full bond and avoids a
          reputation mark. A complainant benefits from a false overage verdict — it triggers a payout from the
          bond. This is a genuine two-sided dispute over a contested fact, not a single-party lookup.
        </p>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Architecture</h2>
        <ol>
          <li><strong>register_event</strong> — organizer locks venue, date, capacity limit, the ticketing and venue hosts, and a bond. The bond stays locked until 7 days after the event starts.</li>
          <li><strong>open_incident</strong> — after the event and inside the challenge window, anyone except the organizer opens a compliance check with a summary, an evidence window and a filing bond.</li>
          <li><strong>commit_evidence / reveal_evidence</strong> — evidence is committed as a hash, then revealed. At reveal the source host is authenticated (government domain, or the host the organizer locked) and the same source cannot be accepted twice for one incident. The organizer cannot submit evidence.</li>
          <li><strong>examine_source</strong> — first independent consensus round: does this source genuinely pertain to this event, and what occupancy figure does it report?</li>
          <li><strong>resolve_incident</strong> — second independent consensus round: adjudicates the incident using only verified sources, against the locked capacity limit. Government figures outrank organizer-host figures, the chosen figure must be one the verified sources reported, and it cannot run while any revealed source is unexamined.</li>
          <li><strong>claim</strong> — pull-based settlement. A slash pays 70% to the complainant and 30% to a protocol pool the organizer can never reclaim. The filing bond is refunded when the breach is upheld or unprovable, and forfeited to the organizer when adjudicated no breach.</li>
        </ol>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Verdict ladder</h2>
        <p>Occupancy ratio is compared against the locked capacity limit:</p>
        <ul>
          <li><strong>No breach</strong> — at or under capacity.</li>
          <li><strong>Mild overage</strong> — up to 10% over capacity.</li>
          <li><strong>Moderate overage</strong> — 10–30% over capacity.</li>
          <li><strong>Severe overage</strong> — more than 30% over capacity.</li>
          <li><strong>Unverifiable</strong> — no verified source established a usable figure, or verified sources conflict with no resolvable majority. No slash is applied.</li>
        </ul>
        <p>Validators must agree on the outcome exactly: each rung carries a different slash, so there is no adjacent-rung tolerance.</p>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Smart contract</h2>
        <p>
          Deployed on GenLayer StudioNet at{' '}
          <a href={EXPLORER_ADDRESS_URL(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
            {CONTRACT_ADDRESS}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>FAQ</h2>
        <p><strong>What counts as an evidence source?</strong> A report on a government domain, the venue's certificate on the venue host locked at registration, or the ticketing platform's record on the ticketing host locked at registration — never a free-text description.</p>
        <p><strong>What happens if no one submits evidence?</strong> The incident can be expired after the evidence window closes, with no consequence to the organizer.</p>
        <p><strong>What proves the tests actually run the contract?</strong> The repository ships direct-mode tests that execute the real contract under the GenVM SDK (<code>pytest tests -q -p no:cacheprovider</code>) — not a static model of it. See docs/deployment.md in the repo for exactly what they do and do not prove.</p>
      </section>
    </div>
  );
}
