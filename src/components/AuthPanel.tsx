import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

/** Opt-in cloud sync panel. The workspace is fully usable without ever touching this. */
export function AuthPanel() {
  const { status, session, error, signIn, signUp, signOut } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (status === 'unconfigured') {
    return <p className="auth-panel auth-panel--unconfigured">Sync cloud non configurée.</p>
  }

  if (status === 'loading') {
    return <p className="auth-panel">Chargement…</p>
  }

  if (status === 'signed-in') {
    return (
      <div className="auth-panel">
        <p>Connecté{session?.email ? ` : ${session.email}` : ''}</p>
        <button type="button" onClick={() => void signOut()}>
          Se déconnecter
        </button>
      </div>
    )
  }

  return (
    <form
      className="auth-panel"
      onSubmit={(event) => {
        event.preventDefault()
        void signIn(email, password)
      }}
    >
      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <input
        type="password"
        placeholder="mot de passe"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <div>
        <button type="submit">Se connecter</button>
        <button type="button" onClick={() => void signUp(email, password)}>
          Créer un compte
        </button>
      </div>
      {error && <p className="auth-panel__error">{error}</p>}
    </form>
  )
}
