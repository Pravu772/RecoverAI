import { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext({
  isColdLoading: true,
  markReady: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [isColdLoading, setIsColdLoading] = useState(true);

  const markReady = useCallback(() => {
    setIsColdLoading(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ isColdLoading, markReady }}>
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;
