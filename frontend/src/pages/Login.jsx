import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import API from "../utils/axios";

const Login = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const initialValues = { email: "", password: "" };

  const validationSchema = Yup.object({
    email: Yup.string().email("Invalid email").required("Email required"),
    password: Yup.string().required("Password required"),
  });

  const handleSubmit = async (values) => {
    try {
      const { data } = await API.post("/api/users/login", values);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      navigate("/chat");
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row items-center justify-center px-4 py-8 gap-6"
      style={{ background: "linear-gradient(to bottom right, #0a374e, #0f253a)" }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-6xl gap-6">

        
        <div className="flex-1 order-1 md:order-1 text-white bg-white/10 backdrop-blur-xl 
          rounded-2xl p-10 shadow-2xl flex flex-col justify-center animate-fadeIn">

          <h1 className="text-5xl font-extrabold tracking-wide mb-6 text-teal-300 drop-shadow-md">
            PesiGo
          </h1>

          <h2 className="text-3xl font-bold mb-4">Let your messages flow ✨</h2>

          <p className="text-white/90 mb-6 leading-relaxed text-lg">
            A simple, peaceful chat space to stay connected —
            without the noise of social media.
          </p>

          <ul className="space-y-4 text-white/80 text-lg">
            <li>💬 Send <strong>50 free messages daily</strong></li>
            <li>🌙 Reduce screen time & avoid doom-scrolling</li>
            <li>🚀 Upgrade to <strong>Premium</strong> for unlimited chatting</li>
            <li>📎 Share photos, videos, emojis & files</li>
            <li>🗑️ Delete for me / delete for everyone</li>
            <li>🔐 Secure and private messaging</li>
          </ul>
        </div>

        
        <div className="flex-1 order-2 md:order-2 bg-white/10 backdrop-blur-xl 
          rounded-2xl p-8 shadow-2xl text-white">

          <h1 className="text-4xl font-bold text-center tracking-wide mb-10">
            LOGIN
          </h1>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-5">

                <div>
                  <Field
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full p-4 rounded-xl bg-white/10 placeholder-gray-200 text-white focus:outline-none"
                  />
                  <ErrorMessage name="email" className="text-red-300 text-sm" component="div" />
                </div>

                <div>
                  <Field
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="w-full p-4 rounded-xl bg-white/10 placeholder-gray-200 text-white focus:outline-none"
                  />
                  <ErrorMessage name="password" className="text-red-300 text-sm" component="div" />
                </div>

                {serverError && <div className="text-red-300 text-sm">{serverError}</div>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full p-4 rounded-xl text-lg font-semibold text-white shadow-md transition-all"
                  style={{ background: "linear-gradient(to right, #00b5b0, #007c7b)" }}
                >
                  {isSubmitting ? "Logging in..." : "LOG IN"}
                </button>
              </Form>
            )}
          </Formik>

          <p className="text-center mt-6 text-sm text-white/80">
            Don’t have an account?{" "}
            <Link to="/register" className="text-teal-300 font-semibold hover:underline">
              Register
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
