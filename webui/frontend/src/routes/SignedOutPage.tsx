// Deliberately makes no API calls: any 401 would bounce to /auth/login and,
// with the SSO session still alive, sign the user straight back in.
export function SignedOutPage() {
  return (
    <div className="page">
      <h1>Signed out</h1>
      <p className="muted">You've been signed out of the Audible import app.</p>
      <button onClick={() => (window.location.href = '/auth/login')}>Log in again</button>
    </div>
  )
}
