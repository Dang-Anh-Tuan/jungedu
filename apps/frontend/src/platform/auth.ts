/**
 * Lớp platform: xác thực. Hiện Firebase Auth — sau có thể thay bằng session cookie / backend.
 */
import { signInWithPopup, type UserCredential } from 'firebase/auth'
import { auth, googleAuthProvider } from '../lib/firebase'

export { auth, googleAuthProvider }

export async function signInWithGooglePopup(): Promise<UserCredential> {
  return signInWithPopup(auth, googleAuthProvider)
}
