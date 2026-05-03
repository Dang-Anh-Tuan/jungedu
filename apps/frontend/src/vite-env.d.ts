/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string
  readonly VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID?: string
  readonly VITE_SUBMISSION_IMAGE_STORAGE?: string
  readonly VITE_GOOGLE_DRIVE_SCOPE_FULL?: string
}
