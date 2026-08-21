import Dashboard from './pages/Dashboard.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';

function App() {
  return (
    <CurrencyProvider>
      <Dashboard />
    </CurrencyProvider>
  );
}

export default App;
