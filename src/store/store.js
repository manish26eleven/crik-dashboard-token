import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

// Preload state from localStorage
const loadState = () => {
    try {
        const serializedState = localStorage.getItem('admin-reduxState');
        if (serializedState === null) {
            return undefined; // Let reducers initialize with defaults
        }
        return JSON.parse(serializedState);
    } catch (err) {
        console.error('Could not load state', err);
        return undefined;
    }
};

const store = configureStore({
    reducer: {
        auth: authReducer,
    },
    preloadedState: loadState(),
});

// Save state to localStorage on every change (debounced)
let saveTimeout = null;

store.subscribe(() => {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        try {
            const state = store.getState();
            const serializedState = JSON.stringify(state);
            localStorage.setItem('admin-reduxState', serializedState);
            localStorage.setItem('admin-auth', JSON.stringify(state.auth.user));
        } catch (err) {
            console.error('Could not save state', err);
        }
    }, 500); // 500ms debounce
});

export default store;
