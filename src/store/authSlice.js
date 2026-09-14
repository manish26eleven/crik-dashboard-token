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
    selectedApp: 'crik', // 'crik' | 'association'
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
        setSelectedApp: (state, action) => {
            state.selectedApp = action.payload; // 'crik' | 'association'
        },
        logout: (state) => {
            state.user = initialState.user;
            state.role = null;
            state.sessionToken = null;
            state.isAuthenticated = false;
            // keep selectedApp so the admin doesn't have to re-select after logout
        },
        setOffline: (state, action) => {
            state.isOffline = action.payload;
        }
    }
});

export const { setUser, setRole, setSession, setSelectedApp, logout, setOffline } = authSlice.actions;

export default authSlice.reducer;

