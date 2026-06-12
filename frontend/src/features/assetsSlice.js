import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
  assets: [],
  asset: null,
  loading: false,
  error: null,
  total: 0,
};

export const fetchAssets = createAsyncThunk(
  'assets/fetchAssets',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/assets', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.error);
    }
  }
);

export const createAsset = createAsyncThunk(
  'assets/createAsset',
  async (assetData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/assets', assetData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.error);
    }
  }
);

export const updateAsset = createAsyncThunk(
  'assets/updateAsset',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/assets/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.error);
    }
  }
);

export const deleteAsset = createAsyncThunk(
  'assets/deleteAsset',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/assets/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data.error);
    }
  }
);

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAsset: (state, action) => {
      state.asset = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action) => {
        state.loading = false;
        state.assets = action.payload;
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.assets.unshift(action.payload);
      })
      .addCase(createAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAsset.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.assets.findIndex(asset => asset.id === action.payload.id);
        if (index !== -1) {
          state.assets[index] = action.payload;
        }
      })
      .addCase(updateAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAsset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAsset.fulfilled, (state, action) => {
        state.loading = false;
        state.assets = state.assets.filter(asset => asset.id !== action.payload);
      })
      .addCase(deleteAsset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setAsset } = assetsSlice.actions;
export default assetsSlice.reducer;