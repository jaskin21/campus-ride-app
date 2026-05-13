import { useEffect } from "react";
import { useAppDispatch } from "./app/hooks";
import { restoreSessionThunk } from "./features/auth/authThunks";
import AppRouter from "./routes/AppRouter";

function App() {
  const dispatch = useAppDispatch();

  console.log("Pool ID:", import.meta.env.VITE_COGNITO_USER_POOL_ID);
  console.log("Client ID:", import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID);

  useEffect(() => {
    dispatch(restoreSessionThunk());
  }, [dispatch]);

  return <AppRouter />;
}

export default App;
