import { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import { LoadingProvider } from './context/LoadingContext.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

function App() {
  // isLoading stays true until Dashboard's first data fetch completes.
  // LoadingScreen will call onDone() after its 300ms exit fade finishes.
  const [showOverlay, setShowOverlay] = useState(true);
  const [isColdLoading, setIsColdLoading] = useState(true);

  return (
    <LoadingProvider>
      <CurrencyProvider>
        {/* Cold-load overlay — rendered above everything, exits gracefully */}
        {showOverlay && (
          <LoadingScreen
            isLoading={isColdLoading}
            onDone={() => setShowOverlay(false)}
          />
        )}

        {/* Dashboard receives a callback to signal "data is ready" */}
        <Dashboard onFirstLoad={() => setIsColdLoading(false)} />
      </CurrencyProvider>
    </LoadingProvider>
  );
}

export default App;

