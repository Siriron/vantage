import { useState } from 'react';
import { Nav } from '../components/Nav';
import { EventList } from '../components/EventList';
import { EventDetail } from '../components/EventDetail';
import { Docs } from '../components/Docs';
import { useGenLayer } from '../lib/useGenLayer';

type Route = { view: 'list' } | { view: 'detail'; eventId: string } | { view: 'docs' };

export function App() {
  const { account, connecting, connect } = useGenLayer();
  const [route, setRoute] = useState<Route>({ view: 'list' });

  return (
    <>
      <Nav
        account={account}
        connecting={connecting}
        onConnect={connect}
        view={route.view === 'docs' ? 'docs' : 'app'}
        onNavigate={(v) => setRoute(v === 'docs' ? { view: 'docs' } : { view: 'list' })}
      />
      {route.view === 'list' && (
        <EventList account={account} onSelectEvent={(eventId) => setRoute({ view: 'detail', eventId })} />
      )}
      {route.view === 'detail' && (
        <EventDetail eventId={route.eventId} account={account} onBack={() => setRoute({ view: 'list' })} />
      )}
      {route.view === 'docs' && <Docs />}
    </>
  );
}
