// API service for FundEd platform
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API}${endpoint}`;
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || 'API request failed');
  }

  return data;
}

// Static data endpoints
export const getCategories = () => apiCall('/categories');
export const getCountries = () => apiCall('/countries');
export const getFieldsOfStudy = () => apiCall('/fields-of-study');

// Campaign endpoints
export const getCampaigns = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiCall(`/campaigns${queryString ? `?${queryString}` : ''}`);
};

export const getCampaign = (campaignId) => apiCall(`/campaigns/${campaignId}`);

export const getMyCampaigns = () => apiCall('/campaigns/my');

export const createCampaign = (campaignData) =>
  apiCall('/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignData),
  });

export const updateCampaign = (campaignId, campaignData) =>
  apiCall(`/campaigns/${campaignId}`, {
    method: 'PUT',
    body: JSON.stringify(campaignData),
  });

// Donation endpoints
export const createCheckout = (donationData) =>
  apiCall('/donations/checkout', {
    method: 'POST',
    body: JSON.stringify(donationData),
  });

export const getPaymentStatus = (sessionId) =>
  apiCall(`/donations/status/${sessionId}`);

export const getCampaignDonations = (campaignId) =>
  apiCall(`/donations/campaign/${campaignId}`);

export const getMyDonations = () => apiCall('/donations/my');

// Auth endpoints
export const getCurrentUser = () => apiCall('/auth/me');

export const logout = () =>
  apiCall('/auth/logout', { method: 'POST' });

// Student profile endpoints
export const createStudentProfile = (profileData) =>
  apiCall('/admin/students/profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });

// Admin endpoints
export const getPendingStudents = () => apiCall('/admin/students/pending');
export const getAllStudents = (status) =>
  apiCall(`/admin/students${status ? `?status=${status}` : ''}`);
export const verifyStudent = (userId, action) =>
  apiCall(`/admin/students/${userId}/verify`, {
    method: 'PUT',
    body: JSON.stringify({ action }),
  });
export const getAdminCampaigns = (status) =>
  apiCall(`/admin/campaigns${status ? `?status=${status}` : ''}`);
export const getAdminStats = () => apiCall('/admin/stats');

// Verification statuses (kept for UI display)
export const verificationStatuses = {
  pending: {
    label: 'Pending Verification',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: 'Clock'
  },
  verified: {
    label: 'Verified Student',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: 'CheckCircle2'
  },
  rejected: {
    label: 'Verification Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: 'XCircle'
  }
};

export default {
  getCategories,
  getCountries,
  getFieldsOfStudy,
  getCampaigns,
  getCampaign,
  getMyCampaigns,
  createCampaign,
  updateCampaign,
  createCheckout,
  getPaymentStatus,
  getCampaignDonations,
  getMyDonations,
  getCurrentUser,
  logout,
  createStudentProfile,
  getPendingStudents,
  getAllStudents,
  verifyStudent,
  getAdminCampaigns,
  getAdminStats,
  verificationStatuses,
};
