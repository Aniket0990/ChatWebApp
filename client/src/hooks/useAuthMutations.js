import { useMutation } from "@tanstack/react-query";
import api from "../utils/axios";
import { prepareFileForUpload } from "../utils/compressFile";

/* ------------------------------- auth api ------------------------------- */

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const registerUser = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await api.put("/auth/update-profile", payload);
  return data;
};

export const changePassword = async (payload) => {
  const { data } = await api.put("/auth/change-password", payload);
  return data;
};

export const uploadFile = async (file) => {
  // Shrink oversized images to the size cap before they leave the browser.
  const prepared = await prepareFileForUpload(file);
  const formData = new FormData();
  formData.append("file", prepared);

  const { data } = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
};

/* ------------------------------ auth hooks ------------------------------ */

/** Login / register / profile mutations. Loading + error state is handled by
 * the mutation itself, so components no longer need manual `loading` flags. */
export const useLogin = () => useMutation({ mutationFn: loginUser });

export const useRegister = () => useMutation({ mutationFn: registerUser });

export const useUpdateProfile = () =>
  useMutation({ mutationFn: updateProfile });

export const useChangePassword = () =>
  useMutation({ mutationFn: changePassword });
