import { useEffect, useState } from 'react';

import styles from './slider.module.css';

const AnimatedInputWrapper = () => {
  return (
    <div className={styles.placeholder}>
      <AnimatedPlaceHolderWrapper />
    </div>
  );
};

const popRepos = ['golang/go', 'mozilla/rust', 'apple/swift', 'oven-sh/bun'];
const AnimatedPlaceHolderWrapper = () => {
  return (
    <div className={styles.animationWrapper}>
      <span>Search for</span>
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
    <div className={styles.textslide}>
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
