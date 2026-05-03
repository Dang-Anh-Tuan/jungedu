import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'

/** Upload ảnh bài làm lên Storage — sau migrate BE có thể đổi thành signed URL + PUT. */
export async function uploadSubmissionImageDataUrl(
  submissionId: string,
  fileId: string,
  dataUrl: string
): Promise<string> {
  const storageRef = ref(storage, `submissions/${submissionId}/${fileId}.jpg`)
  await uploadString(storageRef, dataUrl, 'data_url')
  return getDownloadURL(storageRef)
}
