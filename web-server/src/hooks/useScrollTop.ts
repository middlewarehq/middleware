import { useRouter } from 'next/router';
import { useEffect } from 'react';

const useScrollTop = (): null => {
  const location = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
};

export default useScrollTop;
