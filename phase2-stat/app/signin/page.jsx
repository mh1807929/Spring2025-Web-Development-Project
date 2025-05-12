'use client';

import { signIn } from 'next-auth/react';
import styles from './page.css';

export default function SignInPage() {
  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.currentTarget.username.value;
    const password = e.currentTarget.password.value;

    await signIn('credentials', {
      redirect: true,
      username,
      password,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              className={styles.input}
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Sign In
          </button>
        </form>

        <div className={styles.orDivider}>
          <span>or</span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={() => signIn('google')}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}