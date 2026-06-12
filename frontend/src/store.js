import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import assetsReducer from './features/assetsSlice';
import ticketsReducer from './features/ticketsSlice';
import usersReducer from './features/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetsReducer,
    tickets: ticketsReducer,
    users: usersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});