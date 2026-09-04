import { useContext, useState, useRef } from "react";
import axios from "../utils/axios";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-toastify";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);

  const [name, setName] = useState(user.user.name);
  const [email, setEmail] = useState(user.user.email);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef(null);

  const updateProfile = async () => {
    try {
      setLoading(true);

      const { data } = await axios.put(
        "/auth/update-profile",
        { name, email },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      setUser({
        ...user,
        user: data,
      });

      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    }

    setLoading(false);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.info("Uploading photo...");

      const { data } = await axios.post("/upload", formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const updated = await axios.put(
        "/auth/update-profile",
        { profilePic: data.url },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      setUser({
        ...user,
        user: updated.data,
      });

      toast.success("Photo updated");
    } catch {
      toast.error("Upload failed");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-teal-100">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-10 border border-gray-100">
        <h2 className="text-3xl font-bold mb-8 text-center text-gray-700">
          Profile Settings
        </h2>

        {/* PROFILE IMAGE */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={user.user.profilePic || "/default.png"}
            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg hover:scale-105 transition duration-300"
          />

          <button
            onClick={() => fileRef.current.click()}
            className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition"
          >
            Change Photo
          </button>

          <input
            type="file"
            ref={fileRef}
            onChange={uploadPhoto}
            className="hidden"
          />
        </div>

        {/* NAME */}
        <div className="mb-5">
          <label className="text-sm font-medium text-gray-600">Name</label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-2 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition shadow-sm"
          />
        </div>

        {/* EMAIL */}
        <div className="mb-8">
          <label className="text-sm font-medium text-gray-600">Email</label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-2 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition shadow-sm"
          />
        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={updateProfile}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl shadow-lg hover:scale-105 hover:shadow-xl transition duration-300 font-semibold"
        >
          {loading ? "Updating..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
