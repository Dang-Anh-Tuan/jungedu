/**
 * Lớp truy cập dữ liệu Firebase (Firestore + Storage).
 * Khi chuyển sang BE: triển khai cùng contract trong ví dụ `services/api/` và đổi import ở appStore.
 */
export { createDocumentId } from './ids'
export {
  batchReplaceStudentsForClassDocs,
  deleteClassCascadeDocs,
  deleteExamAndSubmissionsDocs,
  mergeExamDocPatch,
  mergeSubmissionDoc,
  setExamDoc,
  setSchoolClassDoc,
  setSubmissionDoc,
  type DeleteClassCascadeParams,
  type ReplaceStudentsForClassParams
} from './firestoreWrites'
export { uploadSubmissionImageDataUrl } from './storageUpload'
export { subscribeFirestoreCollections, type FirestoreSyncDispatch } from './firestoreSync'
export {
  saveDriveUploadFolderPrefToFirestore,
  saveTeacherGradingExperienceToFirestore,
  subscribeAppSettings,
  subscribeAppSettingsDriveUploadFolder
} from './firestoreAppSettings'
export { rewriteFirestoreError } from './firestoreErrors'
export {
  deepStripUndefined,
  coerceClassId,
  normalizeExam,
  normalizeSchoolClass,
  normalizeStudent,
  normalizeSubmission,
  serializeExam,
  serializeSchoolClass,
  serializeStudent,
  serializeSubmission,
  stripImageFilesForFirestore
} from './firestoreCodec'
