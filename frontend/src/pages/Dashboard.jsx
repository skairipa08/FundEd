import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Heart, TrendingUp, Users, DollarSign, FileText, Eye, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  getAdminStats, 
  getPendingStudents, 
  getAllStudents, 
  getAdminCampaigns, 
  verifyStudent,
  getMyCampaigns,
  getMyDonations,
  verificationStatuses 
} from '../services/api';
import { toast } from '../hooks/use-toast';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [verifiedStudents, setVerifiedStudents] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [myDonations, setMyDonations] = useState([]);

  const currentUser = user?.data || user || { role: 'donor' };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser.role]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (currentUser.role === 'admin') {
        const [statsRes, pendingRes, verifiedRes, campaignsRes] = await Promise.all([
          getAdminStats(),
          getPendingStudents(),
          getAllStudents('verified'),
          getAdminCampaigns()
        ]);
        setStats(statsRes.data);
        setPendingStudents(pendingRes.data || []);
        setVerifiedStudents(verifiedRes.data || []);
        setAllCampaigns(campaignsRes.data || []);
      } else if (currentUser.role === 'student') {
        try {
          const campaignsRes = await getMyCampaigns();
          setMyCampaigns(campaignsRes.data || []);
        } catch (e) {
          // Student may not have campaigns yet
          setMyCampaigns([]);
        }
      } else {
        // Donor
        try {
          const donationsRes = await getMyDonations();
          setMyDonations(donationsRes.data || []);
        } catch (e) {
          setMyDonations([]);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, action) => {
    try {
      await verifyStudent(userId, action);
      toast({
        title: action === 'approve' ? 'Student Verified' : 'Verification Rejected',
        description: `Student has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update verification status.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Admin Dashboard
  if (currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-lg text-gray-600">Manage and verify student campaigns</p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Verification</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats?.verifications?.pending || 0}</p>
                  </div>
                  <Clock className="h-10 w-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Verified Students</p>
                    <p className="text-3xl font-bold text-green-600">{stats?.verifications?.verified || 0}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Raised</p>
                    <p className="text-3xl font-bold text-blue-600">${(stats?.donations?.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Donations</p>
                    <p className="text-3xl font-bold text-purple-600">{stats?.donations?.total_count || 0}</p>
                  </div>
                  <Users className="h-10 w-10 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification Queue */}
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingStudents.length})</TabsTrigger>
              <TabsTrigger value="verified">Verified ({verifiedStudents.length})</TabsTrigger>
              <TabsTrigger value="all">All Campaigns ({allCampaigns.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingStudents.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg text-gray-600">No pending verifications</p>
                  </CardContent>
                </Card>
              ) : (
                pendingStudents.map((profile) => (
                  <Card key={profile.profile_id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <img
                            src={profile.user?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                            alt={profile.user?.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{profile.user?.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {profile.field_of_study} • {profile.country}
                                </p>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                            <p className="text-gray-700 mb-4">{profile.university}</p>
                            <div className="mb-4">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Documents:</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.verification_documents?.map((doc, idx) => (
                                  <Badge key={idx} variant="outline">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {doc.type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <Button
                                size="sm"
                                onClick={() => handleVerify(profile.user_id, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleVerify(profile.user_id, 'reject')}
                                variant="destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="verified" className="space-y-4">
              {verifiedStudents.map((profile) => (
                <Card key={profile.profile_id}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <img
                        src={profile.user?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                        alt={profile.user?.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{profile.user?.name}</h3>
                            <p className="text-sm text-gray-600">
                              {profile.field_of_study} • {profile.country}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <p className="text-gray-700">{profile.university}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {allCampaigns.map((campaign) => {
                const progress = campaign.target_amount > 0 
                  ? (campaign.raised_amount / campaign.target_amount) * 100 
                  : 0;
                const status = verificationStatuses[campaign.student_profile?.verification_status || 'pending'];
                return (
                  <Card key={campaign.campaign_id}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <img
                          src={campaign.student?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                          alt={campaign.student?.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{campaign.title}</h3>
                              <p className="text-sm text-gray-600">
                                {campaign.student?.name} • {campaign.category}
                              </p>
                            </div>
                            <Badge className={`${status?.color || 'bg-gray-100'} border`}>
                              {status?.label || campaign.status}
                            </Badge>
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-semibold">${(campaign.raised_amount || 0).toLocaleString()}</span>
                              <span className="text-gray-600">${(campaign.target_amount || 0).toLocaleString()}</span>
                            </div>
                            <Progress value={Math.min(progress, 100)} className="h-2" />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/campaign/${campaign.campaign_id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Student Dashboard
  if (currentUser.role === 'student') {
    const myCampaign = myCampaigns[0];
    const studentProfile = currentUser.student_profile;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
            <p className="text-lg text-gray-600">Manage your campaign</p>
          </div>

          {/* Verification Status Alert */}
          {studentProfile && studentProfile.verification_status !== 'verified' && (
            <Card className="mb-6 border-yellow-300 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Clock className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-yellow-800">Verification Pending</h3>
                    <p className="text-yellow-700">
                      Your student profile is awaiting verification. You'll be able to create campaigns once verified.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {myCampaign ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Raised</p>
                        <p className="text-3xl font-bold text-blue-600">
                          ${(myCampaign.raised_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-10 w-10 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Donors</p>
                        <p className="text-3xl font-bold text-green-600">{myCampaign.donor_count || 0}</p>
                      </div>
                      <Heart className="h-10 w-10 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Progress</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {myCampaign.target_amount > 0 
                            ? ((myCampaign.raised_amount / myCampaign.target_amount) * 100).toFixed(0)
                            : 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-10 w-10 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>Your Campaign</CardTitle>
                    <Badge className={verificationStatuses[myCampaign.status]?.color || 'bg-blue-100'}>
                      {myCampaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="text-xl font-bold mb-2">{myCampaign.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{myCampaign.story}</p>
                  <Button onClick={() => navigate(`/campaign/${myCampaign.campaign_id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Campaign
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Campaign Yet</h3>
                <p className="text-gray-600 mb-6">
                  {studentProfile?.verification_status === 'verified' 
                    ? 'Create your first campaign to start fundraising'
                    : 'Complete verification to create a campaign'}
                </p>
                <Button 
                  onClick={() => navigate('/create-campaign')} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={studentProfile?.verification_status !== 'verified'}
                >
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Donor Dashboard
  const totalDonated = myDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Donor Dashboard</h1>
          <p className="text-lg text-gray-600">Track your contributions and impact</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Donated</p>
                  <p className="text-3xl font-bold text-blue-600">${totalDonated.toLocaleString()}</p>
                </div>
                <DollarSign className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Students Supported</p>
                  <p className="text-3xl font-bold text-green-600">{myDonations.length}</p>
                </div>
                <Users className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Impact Score</p>
                  <p className="text-3xl font-bold text-purple-600">{Math.min(100, myDonations.length * 10 + 50)}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supported Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Your Supported Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {myDonations.length > 0 ? (
              <div className="space-y-4">
                {myDonations.map((donation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Heart className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-semibold">{donation.campaign?.title || 'Campaign'}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(donation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">${donation.amount}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => donation.campaign && navigate(`/campaign/${donation.campaign.campaign_id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600 mb-6">You haven't supported any campaigns yet</p>
                <Button onClick={() => navigate('/browse')} className="bg-blue-600 hover:bg-blue-700">
                  Browse Campaigns
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
