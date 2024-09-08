import { useEffect, useState } from 'react';

import styles from './slider.module.css';

const AnimatedInputWrapper = () => {
  return (
    <div
      className={styles.placeholder}
      style={{ minWidth: '200px', zIndex: 2 }}
    >
      <AnimatedPlaceHolderWrapper />
    </div>
  );
};

const popRepos = [
  'Search for golang/go',
  'https://gitlab.com/ase/ase',
  '...or mozilla/rust',
  'github.com/oven-sh/bun',
  '...even apple/swift'
];

const AnimatedPlaceHolderWrapper = () => {
  return (
    <div className={styles.animationWrapper}>
      <AnimatedRepos />
    </div>
  );
};

const AnimatedRepos = () => {
  const [animationIndex, setAnimationIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      if (animationIndex < popRepos.length - 1) {
        setAnimationIndex(animationIndex + 1);
      } else {
        setAnimationIndex(0);
      }
    }, 2000);
    return () => clearInterval(interval);
  });
  return (
    <div className={styles.textslide} style={{ zIndex: 2, minWidth: '300px' }}>
      <div
        className={styles.text}
        style={{ bottom: animationIndex * 1.4 + 'em' }}
      >
        {popRepos.map((item) => (
          <div key={item} className={styles.repo}>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimatedInputWrapper;
