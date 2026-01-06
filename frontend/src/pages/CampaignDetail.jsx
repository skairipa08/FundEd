import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, GraduationCap, Calendar, Target, Share2, Heart, CheckCircle2, FileText, Clock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { getCampaign, createCheckout, getPaymentStatus, verificationStatuses } from '../services/api';
import { toast } from '../hooks/use-toast';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Check for payment return
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const response = await getCampaign(id);
        setCampaign(response.data);
      } catch (error) {
        console.error('Failed to load campaign:', error);
        toast({
          title: 'Error',
          description: 'Failed to load campaign details.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    loadCampaign();
  }, [id]);

  const checkPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setCheckingPayment(false);
      toast({
        title: 'Payment Status',
        description: 'Payment status check timed out. Please check your email for confirmation.',
      });
      return;
    }

    setCheckingPayment(true);

    try {
      const response = await getPaymentStatus(sessionId);
      
      if (response.data.payment_status === 'paid') {
        setCheckingPayment(false);
        toast({
          title: 'Thank you!',
          description: 'Your donation was successful. Thank you for supporting this student!',
        });
        // Reload campaign to show updated amounts
        const campaignRes = await getCampaign(id);
        setCampaign(campaignRes.data);
        // Clear the session_id from URL
        navigate(`/campaign/${id}`, { replace: true });
        return;
      } else if (response.data.status === 'expired') {
        setCheckingPayment(false);
        toast({
          title: 'Payment Expired',
          description: 'Payment session expired. Please try again.',
          variant: 'destructive',
        });
        navigate(`/campaign/${id}`, { replace: true });
        return;
      }

      // Continue polling
      setTimeout(() => checkPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setCheckingPayment(false);
      toast({
        title: 'Error',
        description: 'Failed to check payment status.',
        variant: 'destructive',
      });
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(donationAmount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid donation amount.',
        variant: 'destructive',
      });
      return;
    }

    if (!isAnonymous && !donorName) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name or choose to donate anonymously.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingPayment(true);

    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const originUrl = window.location.origin;
      
      const response = await createCheckout({
        campaign_id: campaign.campaign_id,
        amount: amount,
        donor_name: isAnonymous ? 'Anonymous' : donorName,
        donor_email: donorEmail || null,
        anonymous: isAnonymous,
        origin_url: originUrl
      });

      if (response.success && response.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process donation. Please try again.',
        variant: 'destructive',
      });
      setProcessingPayment(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied!',
      description: 'Campaign link copied to clipboard.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign not found</h2>
          <Button onClick={() => navigate('/browse')}>Browse Campaigns</Button>
        </div>
      </div>
    );
  }

  const student = campaign.student || {};
  const progress = campaign.target_amount > 0 
    ? (campaign.raised_amount / campaign.target_amount) * 100 
    : 0;
  const remaining = Math.max(0, campaign.target_amount - campaign.raised_amount);
  const verificationStatus = student.verification_status || 'pending';
  const status = verificationStatuses[verificationStatus] || verificationStatuses.pending;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Payment checking overlay */}
      {checkingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium">Verifying your payment...</p>
            <p className="text-gray-600">Please wait</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/browse')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                  <img
                    src={student.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'}
                    alt={student.name || 'Student'}
                    className="w-32 h-32 rounded-xl object-cover mb-4 md:mb-0"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{campaign.title}</h1>
                        <p className="text-lg text-gray-700 font-medium mb-2">{student.name || 'Student'}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          {student.field_of_study && (
                            <span className="flex items-center">
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {student.field_of_study}
                            </span>
                          )}
                          {student.country && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {student.country}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={`${status.color} border mt-2 md:mt-0`}>
                        {verificationStatus === 'verified' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {status.label}
                      </Badge>
                    </div>
                    {student.university && (
                      <p className="text-gray-700 mb-4">{student.university}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        Timeline: {campaign.timeline}
                      </span>
                      <span className="flex items-center text-gray-600">
                        <Target className="h-4 w-4 mr-1" />
                        Category: {campaign.category}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Story */}
            <Card>
              <CardHeader>
                <CardTitle>Student's Story</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{campaign.story}</p>
              </CardContent>
            </Card>

            {/* Impact Log */}
            {campaign.impact_log && (
              <Card>
                <CardHeader>
                  <CardTitle>Expected Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{campaign.impact_log}</p>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {verificationStatus === 'verified' && student.verification_documents && student.verification_documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Verified Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {student.verification_documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <span className="flex items-center text-gray-700">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                          {doc.type}
                        </span>
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Donor Wall */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Donors ({campaign.donors?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaign.donors && campaign.donors.length > 0 ? (
                    campaign.donors.slice(0, 10).map((donor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Heart className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{donor.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(donor.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-blue-600">${donor.amount}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center py-4">Be the first to donate!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Donation Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Progress Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-3xl font-bold text-gray-900">
                          ${(campaign.raised_amount || 0).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600">raised</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-3 mb-2" />
                      <p className="text-sm text-gray-600">
                        ${(campaign.target_amount || 0).toLocaleString()} goal
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{campaign.donor_count || 0}</p>
                        <p className="text-sm text-gray-600">donors</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">${remaining.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">to go</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Donation Form */}
              {campaign.status === 'active' && (
                <Card>
                  <CardContent className="p-6">
                    <form onSubmit={handleDonate} className="space-y-4">
                      <div>
                        <Label htmlFor="amount" className="mb-2 block">
                          Donation Amount (USD)
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(e.target.value)}
                          min="1"
                          step="0.01"
                          disabled={processingPayment}
                        />
                      </div>

                      {/* Quick Amount Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[25, 50, 100].map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDonationAmount(amount.toString())}
                            disabled={processingPayment}
                          >
                            ${amount}
                          </Button>
                        ))}
                      </div>

                      {!isAnonymous && (
                        <>
                          <div>
                            <Label htmlFor="donorName" className="mb-2 block">
                              Your Name
                            </Label>
                            <Input
                              id="donorName"
                              type="text"
                              placeholder="Enter your name"
                              value={donorName}
                              onChange={(e) => setDonorName(e.target.value)}
                              disabled={processingPayment}
                            />
                          </div>
                          <div>
                            <Label htmlFor="donorEmail" className="mb-2 block">
                              Email (optional)
                            </Label>
                            <Input
                              id="donorEmail"
                              type="email"
                              placeholder="Enter your email"
                              value={donorEmail}
                              onChange={(e) => setDonorEmail(e.target.value)}
                              disabled={processingPayment}
                            />
                          </div>
                        </>
                      )}

                      {/* Anonymous Checkbox */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="anonymous"
                          checked={isAnonymous}
                          onCheckedChange={setIsAnonymous}
                          disabled={processingPayment}
                        />
                        <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                          Donate anonymously
                        </Label>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        size="lg"
                        disabled={processingPayment}
                      >
                        {processingPayment ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-5 w-5" />
                            Donate Now
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {campaign.status === 'completed' && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Campaign Completed!</h3>
                    <p className="text-gray-600">This campaign has reached its goal. Thank you to all donors!</p>
                  </CardContent>
                </Card>
              )}

              {/* Share Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
