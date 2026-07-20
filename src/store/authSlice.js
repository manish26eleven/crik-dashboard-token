import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: {
        name: "User",
        email: "",
        avatar: "/avatar-placeholder.svg",
    },
    role: null,
    sessionToken: null,
    isAuthenticated: false,
    isOffline: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
        },
        setRole: (state, action) => {
            state.role = action.payload;
        },
        setSession: (state, action) => {
            state.sessionToken = action.payload;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = initialState.user;
            state.role = null;
            state.sessionToken = null;
            state.isAuthenticated = false;
        },
        setOffline: (state, action) => {
            state.isOffline = action.payload;
        }
    }
});

export const { setUser, setRole, setSession, logout, setOffline } = authSlice.actions;

export default authSlice.reducer;
