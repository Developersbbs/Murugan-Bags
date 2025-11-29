import { storage } from "@/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { FirebaseError } from "firebase/app";

export const uploadFile = async (file: File, path: string): Promise<string> => {
  // Ensure path doesn't end with a slash
  const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
  const storageRef = ref(storage, `${cleanPath}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
  
  // Rest of the function remains the same
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error: FirebaseError) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error("Error getting download URL:", error);
          reject(error);
        }
      }
    );
  });
};
// Function to delete a file from Firebase Storage
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};
