import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import API from "../utils/axios";

const Register = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const initialValues = {
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    profilePic: null,
  };

  const validationSchema = Yup.object({
    username: Yup.string().required("Username required"),
    email: Yup.string().email("Invalid email").required("Email required"),
    password: Yup.string()
      .min(5, "Minimum 5 characters")
      .matches(/^[A-Za-z0-9]+$/, "Letters or numbers only")
      .required("Password required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm password required"),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const formData = new FormData();
      formData.append("username", values.username);
      formData.append("email", values.email);
      formData.append("password", values.password);
      if (values.profilePic) formData.append("profilePic", values.profilePic);

      await API.post("/api/users/register", formData);
      navigate("/");
    } catch (err) {
      setServerError(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(to bottom right, #0a374e, #0f253a)",
      }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-5xl gap-8 items-center">

   
        <div className="flex-1 flex justify-center items-center">
          <img
            src="/PesiGO1.png"
            alt="PesiGo Logo"
            className="w-64 md:w-80 drop-shadow-2xl rounded-2xl "
          />
        </div>

       
        <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-xl text-white w-full max-w-md">

          <h1 className="text-4xl font-bold text-center tracking-wide mb-10">
            REGISTER
          </h1>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ setFieldValue, isSubmitting }) => (
              <Form className="space-y-5">

                <div>
                  <Field
                    name="username"
                    placeholder="Username"
                    className="w-full p-4 rounded-xl bg-white/10 text-white placeholder-gray-200 focus:outline-none"
                  />
                  <ErrorMessage
                    name="username"
                    className="text-red-300 text-sm"
                    component="div"
                  />
                </div>

                <div>
                  <Field
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full p-4 rounded-xl bg-white/10 text-white placeholder-gray-200 focus:outline-none"
                  />
                  <ErrorMessage
                    name="email"
                    className="text-red-300 text-sm"
                    component="div"
                  />
                </div>

                <div>
                  <Field
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="w-full p-4 rounded-xl bg-white/10 text-white placeholder-gray-200 focus:outline-none"
                  />
                  <ErrorMessage
                    name="password"
                    className="text-red-300 text-sm"
                    component="div"
                  />
                </div>

                <div>
                  <Field
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    className="w-full p-4 rounded-xl bg-white/10 text-white placeholder-gray-200 focus:outline-none"
                  />
                  <ErrorMessage
                    name="confirmPassword"
                    className="text-red-300 text-sm"
                    component="div"
                  />
                </div>

               
                <div>
                  <label className="text-sm mb-1 block">Upload Your Photo</label>

                  <div className="flex items-center gap-4">
                    <label className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl cursor-pointer">
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setFieldValue("profilePic", file);
                          setPreviewImage(URL.createObjectURL(file));
                        }}
                      />
                    </label>

                    {previewImage && (
                      <img
                        src={previewImage}
                        className="w-12 h-12 rounded-full object-cover border border-white/40 shadow"
                      />
                    )}
                  </div>
                </div>

                {serverError && (
                  <div className="text-red-300 text-sm">{serverError}</div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full p-4 rounded-xl text-lg font-semibold text-white shadow-md transition-all"
                  style={{
                    background: "linear-gradient(to right, #00b5b0, #007c7b)",
                  }}
                >
                  {isSubmitting ? "Creating..." : "REGISTER"}
                </button>
              </Form>
            )}
          </Formik>

          <p className="text-center mt-6 text-sm text-white/80">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-teal-300 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Register;
